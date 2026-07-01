import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { OrganizationAccessService } from './organization-access.service.js';
import { PasswordService } from './password.service.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    OrganizationAccessService,
    PasswordService,
    RolesGuard,
  ],
  exports: [
    JwtModule,
    JwtAuthGuard,
    OrganizationAccessService,
    PasswordService,
    RolesGuard,
  ],
})
export class AuthModule {}
