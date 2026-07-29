import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DemoNotificationStatus, DemoRequestTeamSize } from '@soyre/database';
import { DemoNotificationRetryWorker } from '../src/demo-requests/demo-notification-retry-worker.js';

const baseRecord = {
  challenge: null,
  company: 'Inmobiliaria Ejemplo',
  country: 'Panamá',
  createdAt: new Date('2026-07-29T10:00:00.000Z'),
  email: 'broker@example.com',
  id: '00000000-0000-4000-8000-000000000201',
  name: 'Ada Broker',
  notificationAttempts: 1,
  notificationLastAttemptAt: new Date('2026-07-29T11:00:00.000Z'),
  notificationLastError: 'provider unavailable',
  notificationStatus: DemoNotificationStatus.FAILED,
  notifiedAt: null as Date | null,
  teamSize: DemoRequestTeamSize.TWO_TO_FIVE,
};

describe('DemoNotificationRetryWorker', () => {
  it('allows only one of two workers to claim and send a retry', async () => {
    const harness = createRetryHarness();
    let notifications = 0;
    const notifier = {
      notify: async () => {
        notifications += 1;
      },
    };
    const firstWorker = new DemoNotificationRetryWorker(
      harness.prisma as never,
      notifier as never,
    );
    const secondWorker = new DemoNotificationRetryWorker(
      harness.prisma as never,
      notifier as never,
    );
    const now = new Date('2026-07-29T12:00:00.000Z');

    const results = await Promise.all([
      firstWorker.runBatch(now),
      secondWorker.runBatch(now),
    ]);

    assert.equal(
      results.reduce((total, result) => total + result.claimed, 0),
      1,
    );
    assert.equal(
      results.reduce((total, result) => total + result.sent, 0),
      1,
    );
    assert.equal(notifications, 1);
    assert.equal(harness.record.notificationAttempts, 2);
    assert.equal(
      harness.record.notificationStatus,
      DemoNotificationStatus.SENT,
    );
  });

  it('retries a transient failure after backoff and later marks it sent', async () => {
    const harness = createRetryHarness();
    let notifications = 0;
    const worker = new DemoNotificationRetryWorker(
      harness.prisma as never,
      {
        notify: async () => {
          notifications += 1;
          if (notifications === 1) {
            throw new Error('temporary Resend outage');
          }
        },
      } as never,
    );

    const failedBatch = await worker.runBatch(
      new Date('2026-07-29T12:00:00.000Z'),
    );
    assert.equal(failedBatch.failed, 1);
    assert.equal(harness.record.notificationAttempts, 2);
    assert.equal(
      harness.record.notificationStatus,
      DemoNotificationStatus.FAILED,
    );

    const successfulBatch = await worker.runBatch(
      new Date('2026-07-29T12:16:00.000Z'),
    );
    assert.equal(successfulBatch.sent, 1);
    assert.equal(notifications, 2);
    assert.equal(harness.record.notificationAttempts, 3);
    assert.equal(
      harness.record.notificationStatus,
      DemoNotificationStatus.SENT,
    );
  });

  it('leaves the fifth failure terminal and does not select it again', async () => {
    const harness = createRetryHarness({
      notificationAttempts: 4,
      notificationLastAttemptAt: new Date('2026-07-29T05:00:00.000Z'),
    });
    let notifications = 0;
    const worker = new DemoNotificationRetryWorker(
      harness.prisma as never,
      {
        notify: async () => {
          notifications += 1;
          throw new Error('persistent provider failure');
        },
      } as never,
    );

    const failedBatch = await worker.runBatch(
      new Date('2026-07-29T12:00:00.000Z'),
    );
    const terminalBatch = await worker.runBatch(
      new Date('2026-07-30T12:00:00.000Z'),
    );

    assert.equal(failedBatch.failed, 1);
    assert.equal(failedBatch.terminal, 1);
    assert.equal(terminalBatch.claimed, 0);
    assert.equal(terminalBatch.terminal, 1);
    assert.equal(notifications, 1);
    assert.equal(harness.record.notificationAttempts, 5);
    assert.equal(
      harness.record.notificationStatus,
      DemoNotificationStatus.FAILED,
    );
  });
});

function createRetryHarness(overrides: Partial<typeof baseRecord> = {}) {
  const record = {
    ...baseRecord,
    ...overrides,
  };
  const prisma = {
    demoRequest: {
      count: async () =>
        record.notificationStatus === DemoNotificationStatus.FAILED &&
        record.notificationAttempts >= 5
          ? 1
          : 0,
      findMany: async () => {
        const retryable =
          record.notificationAttempts < 5 &&
          [
            DemoNotificationStatus.FAILED,
            DemoNotificationStatus.PENDING,
          ].includes(record.notificationStatus);

        return retryable ? [{ ...record }] : [];
      },
      updateMany: async ({
        data,
        where,
      }: {
        data: Record<string, unknown>;
        where: Record<string, unknown>;
      }) => {
        if (!matchesWhere(record, where)) {
          return { count: 0 };
        }

        const attempts = data.notificationAttempts;
        if (
          attempts &&
          typeof attempts === 'object' &&
          'increment' in attempts
        ) {
          record.notificationAttempts += Number(attempts.increment);
        }
        if ('notificationLastAttemptAt' in data) {
          record.notificationLastAttemptAt =
            data.notificationLastAttemptAt as Date;
        }
        if ('notificationLastError' in data) {
          record.notificationLastError = data.notificationLastError as string;
        }
        if ('notificationStatus' in data) {
          record.notificationStatus =
            data.notificationStatus as DemoNotificationStatus;
        }
        if ('notifiedAt' in data) {
          record.notifiedAt = data.notifiedAt as Date;
        }

        return { count: 1 };
      },
    },
  };

  return { prisma, record };
}

function matchesWhere(
  record: typeof baseRecord,
  where: Record<string, unknown>,
) {
  if (where.id !== undefined && where.id !== record.id) {
    return false;
  }
  if (
    where.notificationAttempts !== undefined &&
    where.notificationAttempts !== record.notificationAttempts
  ) {
    return false;
  }
  if (
    where.notificationStatus !== undefined &&
    where.notificationStatus !== record.notificationStatus
  ) {
    return false;
  }
  if ('notificationLastAttemptAt' in where) {
    const expected = where.notificationLastAttemptAt as Date | null;
    const actual = record.notificationLastAttemptAt;
    if (expected?.getTime() !== actual?.getTime()) {
      return false;
    }
  }

  return true;
}
