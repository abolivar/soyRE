import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  DemoNotificationStatus,
  type DemoRequestTeamSize,
} from '@soyre/database';
import { PrismaService } from '../database/prisma.service.js';
import { toSafeDemoNotificationError } from './demo-notification-error.js';
import { DemoRequestNotifier } from './demo-request-notifier.js';

const BATCH_SIZE = 10;
const CANDIDATE_LIMIT = 50;
const MAX_NOTIFICATION_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 60_000;
const RETRY_BACKOFF_MS = [
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
] as const;

type RetryCandidate = {
  challenge: string | null;
  company: string;
  country: string;
  createdAt: Date;
  email: string;
  id: string;
  name: string;
  notificationAttempts: number;
  notificationLastAttemptAt: Date | null;
  notificationStatus: DemoNotificationStatus;
  teamSize: DemoRequestTeamSize;
};

export type DemoNotificationRetryBatchResult = {
  claimed: number;
  failed: number;
  scanned: number;
  sent: number;
  terminal: number;
};

@Injectable()
export class DemoNotificationRetryWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DemoNotificationRetryWorker.name);
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DemoRequestNotifier)
    private readonly notifier: DemoRequestNotifier,
  ) {}

  onModuleInit() {
    if (
      process.env.DEMO_NOTIFICATION_RETRY_ENABLED?.trim().toLowerCase() !==
      'true'
    ) {
      return;
    }

    this.interval = setInterval(() => {
      void this.runScheduledBatch();
    }, RETRY_INTERVAL_MS);
    this.interval.unref();
    void this.runScheduledBatch();
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async runBatch(now = new Date()): Promise<DemoNotificationRetryBatchResult> {
    const candidates: RetryCandidate[] = await this.prisma.demoRequest.findMany(
      {
        orderBy: [{ notificationLastAttemptAt: 'asc' }, { createdAt: 'asc' }],
        take: CANDIDATE_LIMIT,
        where: {
          notificationAttempts: { lt: MAX_NOTIFICATION_ATTEMPTS },
          notificationStatus: {
            in: [DemoNotificationStatus.FAILED, DemoNotificationStatus.PENDING],
          },
        },
      },
    );
    const terminal = await this.prisma.demoRequest.count({
      where: {
        notificationAttempts: { gte: MAX_NOTIFICATION_ATTEMPTS },
        notificationStatus: DemoNotificationStatus.FAILED,
      },
    });
    const result: DemoNotificationRetryBatchResult = {
      claimed: 0,
      failed: 0,
      scanned: candidates.length,
      sent: 0,
      terminal,
    };

    for (const candidate of candidates.filter((request) =>
      isDueForRetry(request, now),
    )) {
      if (result.claimed >= BATCH_SIZE) {
        break;
      }

      const claimed = await this.claim(candidate, now);
      if (!claimed) {
        continue;
      }

      result.claimed += 1;
      const nextAttempt = candidate.notificationAttempts + 1;

      try {
        await this.notifier.notify(candidate);
        await this.prisma.demoRequest.updateMany({
          data: {
            notificationLastError: null,
            notificationStatus: DemoNotificationStatus.SENT,
            notifiedAt: now,
          },
          where: {
            id: candidate.id,
            notificationAttempts: nextAttempt,
            notificationStatus: DemoNotificationStatus.PENDING,
          },
        });
        result.sent += 1;
      } catch (error) {
        await this.prisma.demoRequest.updateMany({
          data: {
            notificationLastError: toSafeDemoNotificationError(error),
            notificationStatus: DemoNotificationStatus.FAILED,
          },
          where: {
            id: candidate.id,
            notificationAttempts: nextAttempt,
            notificationStatus: DemoNotificationStatus.PENDING,
          },
        });
        result.failed += 1;
        if (nextAttempt >= MAX_NOTIFICATION_ATTEMPTS) {
          result.terminal += 1;
        }
      }
    }

    return result;
  }

  private async claim(candidate: RetryCandidate, now: Date) {
    const claimed = await this.prisma.demoRequest.updateMany({
      data: {
        notificationAttempts: { increment: 1 },
        notificationLastAttemptAt: now,
        notificationLastError: null,
        notificationStatus: DemoNotificationStatus.PENDING,
      },
      where: {
        id: candidate.id,
        notificationAttempts: candidate.notificationAttempts,
        notificationLastAttemptAt: candidate.notificationLastAttemptAt,
        notificationStatus: candidate.notificationStatus,
      },
    });

    return claimed.count === 1;
  }

  private async runScheduledBatch() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const result = await this.runBatch();
      this.logger.log(
        JSON.stringify({
          event: 'demo_notification_retry_batch',
          ...result,
        }),
      );
    } catch {
      this.logger.error(
        JSON.stringify({
          event: 'demo_notification_retry_batch_error',
        }),
      );
    } finally {
      this.running = false;
    }
  }
}

function isDueForRetry(candidate: RetryCandidate, now: Date) {
  if (candidate.notificationAttempts >= MAX_NOTIFICATION_ATTEMPTS) {
    return false;
  }

  const lastAttemptAt =
    candidate.notificationLastAttemptAt ?? candidate.createdAt;
  const backoffIndex = Math.max(candidate.notificationAttempts - 1, 0);
  const backoffMs =
    RETRY_BACKOFF_MS[Math.min(backoffIndex, RETRY_BACKOFF_MS.length - 1)] ??
    RETRY_BACKOFF_MS[0];

  return lastAttemptAt.getTime() <= now.getTime() - backoffMs;
}
