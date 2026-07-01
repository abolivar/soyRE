import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator.js';

@Controller('health')
@Public()
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'soyre-api',
    };
  }
}
