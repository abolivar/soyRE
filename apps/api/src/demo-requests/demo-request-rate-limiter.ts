import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

@Injectable()
export class DemoRequestRateLimiter {
  private readonly attempts = new Map<string, number[]>();
  private checksSinceCleanup = 0;

  assertAllowed(fingerprint: string, now = Date.now()) {
    const windowStart = now - WINDOW_MS;
    const recentAttempts = (this.attempts.get(fingerprint) ?? []).filter(
      (attemptedAt) => attemptedAt > windowStart,
    );

    if (recentAttempts.length >= MAX_REQUESTS) {
      throw new HttpException(
        'Too many demo requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recentAttempts.push(now);
    this.attempts.set(fingerprint, recentAttempts);
    this.checksSinceCleanup += 1;

    if (this.checksSinceCleanup >= 100) {
      this.cleanup(windowStart);
    }
  }

  private cleanup(windowStart: number) {
    for (const [fingerprint, attempts] of this.attempts) {
      const recentAttempts = attempts.filter(
        (attemptedAt) => attemptedAt > windowStart,
      );

      if (recentAttempts.length === 0) {
        this.attempts.delete(fingerprint);
      } else {
        this.attempts.set(fingerprint, recentAttempts);
      }
    }

    this.checksSinceCleanup = 0;
  }
}
