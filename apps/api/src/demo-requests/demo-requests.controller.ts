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
  async create(@Body() dto: CreateDemoRequestDto, @Req() request: Request) {
    await this.rateLimiter.assertAllowed(resolveRequestAddress(request));
    return this.demoRequests.create(dto);
  }
}

function resolveRequestAddress(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0];

  return forwardedAddress?.trim() || request.ip || 'unknown';
}
