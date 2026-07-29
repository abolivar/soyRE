import { createHash, randomUUID } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DemoRequestRateLimitStore } from './demo-request-rate-limit-store.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
const MINIMUM_SECRET_LENGTH = 32;

@Injectable()
export class DemoRequestRateLimiter {
  constructor(
    @Inject(DemoRequestRateLimitStore)
    private readonly store: DemoRequestRateLimitStore,
  ) {}

  async assertAllowed(address: string, now = Date.now()) {
    if (process.env.DEMO_REQUESTS_ENABLED?.trim().toLowerCase() !== 'true') {
      return;
    }

    const secret = process.env.DEMO_REQUEST_RATE_LIMIT_SECRET?.trim();

    if (!secret || secret.length < MINIMUM_SECRET_LENGTH) {
      throw new ServiceUnavailableException(
        'Demo request protection is not configured.',
      );
    }

    const fingerprint = createHash('sha256')
      .update(`${secret}:${address}`)
      .digest('hex');
    const allowed = await this.store.consume({
      attemptedAt: now,
      fingerprint,
      maxRequests: MAX_REQUESTS,
      member: `${now}:${randomUUID()}`,
      windowMs: WINDOW_MS,
    });

    if (!allowed) {
      throw new HttpException(
        'Too many demo requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
