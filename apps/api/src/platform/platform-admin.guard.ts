import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { PlatformAccessService } from './platform-access.service.js';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    @Inject(PlatformAccessService)
    private readonly platformAccess: PlatformAccessService,
  ) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    this.platformAccess.assertPlatformAdmin(request.auth);

    return true;
  }
}
