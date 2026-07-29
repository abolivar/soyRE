import { createHash } from 'node:crypto';
import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator.js';
import { DemoRequestRateLimiter } from './demo-request-rate-limiter.js';
import { DemoRequestsService } from './demo-requests.service.js';
import { CreateDemoRequestDto } from './dto/create-demo-request.dto.js';

@Public()
@Controller('public/demo-requests')
export class DemoRequestsController {
  constructor(
    @Inject(DemoRequestsService)
    private readonly demoRequests: DemoRequestsService,
    @Inject(DemoRequestRateLimiter)
    private readonly rateLimiter: DemoRequestRateLimiter,
  ) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateDemoRequestDto, @Req() request: Request) {
    this.rateLimiter.assertAllowed(fingerprintRequest(request));
    return this.demoRequests.create(dto);
  }
}

function fingerprintRequest(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0];
  const address = forwardedAddress?.trim() || request.ip || 'unknown';
  const salt =
    process.env.DEMO_REQUEST_RATE_LIMIT_SECRET?.trim() ||
    'soypms-demo-request-rate-limit';

  return createHash('sha256').update(`${salt}:${address}`).digest('hex');
}
