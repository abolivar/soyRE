import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DemoNotificationStatus } from '@soyre/database';
import { PrismaService } from '../database/prisma.service.js';
import { toSafeDemoNotificationError } from './demo-notification-error.js';
import {
  DemoRequestNotifier,
  type NotifiableDemoRequest,
} from './demo-request-notifier.js';
import type { CreateDemoRequestDto } from './dto/create-demo-request.dto.js';

export const DEMO_REQUEST_RECEIVED = 'received' as const;

@Injectable()
export class DemoRequestsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DemoRequestNotifier)
    private readonly notifier: DemoRequestNotifier,
  ) {}

  async create(dto: CreateDemoRequestDto) {
    if (process.env.DEMO_REQUESTS_ENABLED?.trim().toLowerCase() !== 'true') {
      throw new ServiceUnavailableException(
        'Demo requests are not available yet.',
      );
    }

    const consentPolicyVersion =
      process.env.DEMO_CONSENT_POLICY_VERSION?.trim();

    if (!consentPolicyVersion) {
      throw new ServiceUnavailableException(
        'Demo consent policy is not configured.',
      );
    }

    if (dto.website?.trim()) {
      return {
        requestId: randomUUID(),
        status: DEMO_REQUEST_RECEIVED,
      };
    }

    const request = await this.prisma.demoRequest.create({
      data: {
        challenge: normalizeOptional(dto.challenge),
        company: dto.company.trim(),
        consentGiven: dto.consent,
        consentPolicyVersion,
        consentedAt: new Date(),
        country: dto.country.trim(),
        email: dto.email.trim().toLowerCase(),
        name: dto.name.trim(),
        pageUrl: normalizeOptional(dto.pageUrl),
        referrer: normalizeOptional(dto.referrer),
        teamSize: dto.teamSize,
        utmCampaign: normalizeOptional(dto.utmCampaign),
        utmContent: normalizeOptional(dto.utmContent),
        utmMedium: normalizeOptional(dto.utmMedium),
        utmSource: normalizeOptional(dto.utmSource),
        utmTerm: normalizeOptional(dto.utmTerm),
      },
    });

    await this.attemptNotification(request);

    return {
      requestId: request.id,
      status: DEMO_REQUEST_RECEIVED,
    };
  }

  private async attemptNotification(request: NotifiableDemoRequest) {
    const attemptedAt = new Date();

    try {
      await this.notifier.notify(request);
      await this.prisma.demoRequest.update({
        data: {
          notificationAttempts: { increment: 1 },
          notificationLastAttemptAt: attemptedAt,
          notificationLastError: null,
          notificationStatus: DemoNotificationStatus.SENT,
          notifiedAt: attemptedAt,
        },
        where: { id: request.id },
      });
    } catch (error) {
      await this.prisma.demoRequest.update({
        data: {
          notificationAttempts: { increment: 1 },
          notificationLastAttemptAt: attemptedAt,
          notificationLastError: toSafeDemoNotificationError(error),
          notificationStatus: DemoNotificationStatus.FAILED,
        },
        where: { id: request.id },
      });
    }
  }
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}
