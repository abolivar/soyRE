import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  DemoNotificationStatus,
  DemoRequestStatus,
  DemoRequestTeamSize,
} from '@soyre/database';
import { HttpException, ValidationPipe } from '@nestjs/common';
import { DemoRequestRateLimiter } from '../src/demo-requests/demo-request-rate-limiter.js';
import {
  DEMO_REQUEST_RECEIVED,
  DemoRequestsService,
} from '../src/demo-requests/demo-requests.service.js';
import { CreateDemoRequestDto } from '../src/demo-requests/dto/create-demo-request.dto.js';

const requestId = '00000000-0000-4000-8000-000000000101';
const baseDto = {
  company: 'Inmobiliaria Ejemplo',
  consent: true,
  country: 'Panamá',
  email: ' Broker@Example.com ',
  name: ' Ada Broker ',
  teamSize: DemoRequestTeamSize.TWO_TO_FIVE,
};

const storedRequest = {
  challenge: null,
  company: 'Inmobiliaria Ejemplo',
  consentGiven: true,
  consentPolicyVersion: 'draft-2026-07-28',
  consentedAt: new Date('2026-07-28T00:00:00.000Z'),
  country: 'Panamá',
  createdAt: new Date('2026-07-28T00:00:00.000Z'),
  email: 'broker@example.com',
  id: requestId,
  name: 'Ada Broker',
  notificationAttempts: 0,
  notificationLastAttemptAt: null,
  notificationLastError: null,
  notificationStatus: DemoNotificationStatus.PENDING,
  notifiedAt: null,
  pageUrl: null,
  referrer: null,
  status: DemoRequestStatus.NEW,
  teamSize: DemoRequestTeamSize.TWO_TO_FIVE,
  updatedAt: new Date('2026-07-28T00:00:00.000Z'),
  utmCampaign: null,
  utmContent: null,
  utmMedium: null,
  utmSource: null,
  utmTerm: null,
};

const originalDemoRequestsEnabled = process.env.DEMO_REQUESTS_ENABLED;
const originalConsentPolicyVersion = process.env.DEMO_CONSENT_POLICY_VERSION;
const originalRateLimitSecret = process.env.DEMO_REQUEST_RATE_LIMIT_SECRET;

beforeEach(() => {
  process.env.DEMO_CONSENT_POLICY_VERSION = 'draft-2026-07-28';
  process.env.DEMO_REQUEST_RATE_LIMIT_SECRET =
    'test-secret-with-at-least-32-characters';
  process.env.DEMO_REQUESTS_ENABLED = 'true';
});

afterEach(() => {
  if (originalDemoRequestsEnabled === undefined) {
    delete process.env.DEMO_REQUESTS_ENABLED;
  } else {
    process.env.DEMO_REQUESTS_ENABLED = originalDemoRequestsEnabled;
  }

  if (originalConsentPolicyVersion === undefined) {
    delete process.env.DEMO_CONSENT_POLICY_VERSION;
  } else {
    process.env.DEMO_CONSENT_POLICY_VERSION = originalConsentPolicyVersion;
  }

  if (originalRateLimitSecret === undefined) {
    delete process.env.DEMO_REQUEST_RATE_LIMIT_SECRET;
  } else {
    process.env.DEMO_REQUEST_RATE_LIMIT_SECRET = originalRateLimitSecret;
  }
});

describe('DemoRequestsService', () => {
  it('persists normalized consent data before sending the notification', async () => {
    const calls: string[] = [];
    let createData: Record<string, unknown> | undefined;
    let updateData: Record<string, unknown> | undefined;
    const service = new DemoRequestsService(
      {
        demoRequest: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            calls.push('persist');
            createData = data;
            return storedRequest;
          },
          update: async ({ data }: { data: Record<string, unknown> }) => {
            calls.push('notification-state');
            updateData = data;
            return storedRequest;
          },
        },
      } as never,
      {
        notify: async () => {
          calls.push('notify');
        },
      } as never,
    );

    const result = await service.create({
      ...baseDto,
      challenge: '  Controlar expedientes  ',
      utmSource: '  chatgpt.com  ',
    });

    assert.deepEqual(result, {
      requestId,
      status: DEMO_REQUEST_RECEIVED,
    });
    assert.deepEqual(calls, ['persist', 'notify', 'notification-state']);
    assert.equal(createData?.email, 'broker@example.com');
    assert.equal(createData?.name, 'Ada Broker');
    assert.equal(createData?.challenge, 'Controlar expedientes');
    assert.equal(createData?.utmSource, 'chatgpt.com');
    assert.equal(createData?.consentGiven, true);
    assert.equal(updateData?.notificationStatus, DemoNotificationStatus.SENT);
  });

  it('keeps the lead and returns 201-compatible data when Resend fails', async () => {
    let updateData: Record<string, unknown> | undefined;
    const service = new DemoRequestsService(
      {
        demoRequest: {
          create: async () => storedRequest,
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updateData = data;
            return storedRequest;
          },
        },
      } as never,
      {
        notify: async () => {
          throw new Error('provider unavailable');
        },
      } as never,
    );

    const result = await service.create(baseDto);

    assert.deepEqual(result, {
      requestId,
      status: DEMO_REQUEST_RECEIVED,
    });
    assert.equal(updateData?.notificationStatus, DemoNotificationStatus.FAILED);
    assert.equal(updateData?.notificationLastError, 'provider unavailable');
  });

  it('accepts honeypot submissions without persisting them', async () => {
    const service = new DemoRequestsService(
      {
        demoRequest: {
          create: async () => {
            assert.fail('honeypot requests must not be persisted');
          },
        },
      } as never,
      {
        notify: async () => {
          assert.fail('honeypot requests must not notify');
        },
      } as never,
    );

    const result = await service.create({
      ...baseDto,
      website: 'https://spam.example',
    });

    assert.equal(result.status, DEMO_REQUEST_RECEIVED);
    assert.match(result.requestId, /^[0-9a-f-]{36}$/);
  });
});

describe('DemoRequestRateLimiter', () => {
  it('returns 429 after five attempts shared by two logical instances', async () => {
    const attempts = new Map<string, number[]>();
    const createStore = () => ({
      consume: async ({
        attemptedAt,
        fingerprint,
        maxRequests,
        windowMs,
      }: {
        attemptedAt: number;
        fingerprint: string;
        maxRequests: number;
        windowMs: number;
      }) => {
        const recentAttempts = (attempts.get(fingerprint) ?? []).filter(
          (attempt) => attempt > attemptedAt - windowMs,
        );

        if (recentAttempts.length >= maxRequests) {
          return false;
        }

        attempts.set(fingerprint, [...recentAttempts, attemptedAt]);
        return true;
      },
    });
    const firstInstance = new DemoRequestRateLimiter(createStore() as never);
    const secondInstance = new DemoRequestRateLimiter(createStore() as never);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const limiter = attempt % 2 === 0 ? firstInstance : secondInstance;
      await limiter.assertAllowed('203.0.113.10', 1_000 + attempt);
    }

    await assert.rejects(
      () => secondInstance.assertAllowed('203.0.113.10', 2_000),
      (error: unknown) =>
        error instanceof HttpException && error.getStatus() === 429,
    );
    assert.equal(attempts.has('203.0.113.10'), false);
    assert.match([...attempts.keys()][0] ?? '', /^[a-f0-9]{64}$/);
  });

  it('fails closed when the shared store is unavailable', async () => {
    const limiter = new DemoRequestRateLimiter({
      consume: async () => {
        throw new HttpException('unavailable', 503);
      },
    } as never);

    await assert.rejects(
      () => limiter.assertAllowed('203.0.113.10'),
      (error: unknown) =>
        error instanceof HttpException && error.getStatus() === 503,
    );
  });

  it('does not contact Redis while the public endpoint gate is closed', async () => {
    process.env.DEMO_REQUESTS_ENABLED = 'false';
    const limiter = new DemoRequestRateLimiter({
      consume: async () => {
        assert.fail('the shared store must stay idle while the gate is closed');
      },
    } as never);

    await limiter.assertAllowed('203.0.113.10');
  });
});

describe('CreateDemoRequestDto', () => {
  const validationPipe = new ValidationPipe({
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true,
  });

  async function validate(payload: Record<string, unknown>) {
    return validationPipe.transform(payload, {
      metatype: CreateDemoRequestDto,
      type: 'body',
    });
  }

  it('accepts the documented public contract', async () => {
    const result = await validate(baseDto);
    assert.ok(result instanceof CreateDemoRequestDto);
  });

  for (const invalidPayload of [
    { ...baseDto, consent: false },
    { ...baseDto, email: 'not-an-email' },
    { ...baseDto, teamSize: 'INVALID' },
    { ...baseDto, unexpected: 'field' },
  ]) {
    it(`rejects invalid payload ${JSON.stringify(invalidPayload)}`, async () => {
      await assert.rejects(() => validate(invalidPayload));
    });
  }
});
