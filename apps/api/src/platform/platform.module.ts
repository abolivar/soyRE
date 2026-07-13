import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PlatformAccessService } from './platform-access.service.js';
import { PlatformAdminGuard } from './platform-admin.guard.js';
import { PlatformController } from './platform.controller.js';
import { PlatformService } from './platform.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PlatformController],
  providers: [PlatformAccessService, PlatformAdminGuard, PlatformService],
  exports: [PlatformAccessService],
})
export class PlatformModule {}
