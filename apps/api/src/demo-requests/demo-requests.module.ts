import { Module } from '@nestjs/common';
import { DemoNotificationRetryWorker } from './demo-notification-retry-worker.js';
import { DemoRequestNotifier } from './demo-request-notifier.js';
import { DemoRequestRateLimitStore } from './demo-request-rate-limit-store.js';
import { DemoRequestRateLimiter } from './demo-request-rate-limiter.js';
import { DemoRequestsController } from './demo-requests.controller.js';
import { DemoRequestsService } from './demo-requests.service.js';

@Module({
  controllers: [DemoRequestsController],
  providers: [
    DemoRequestsService,
    DemoRequestNotifier,
    DemoNotificationRetryWorker,
    DemoRequestRateLimitStore,
    DemoRequestRateLimiter,
  ],
})
export class DemoRequestsModule {}
