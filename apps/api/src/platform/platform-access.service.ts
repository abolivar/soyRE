import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@Injectable()
export class PlatformAccessService {
  isPlatformAdmin(email: string, rawAllowlist = process.env.PLATFORM_ADMIN_EMAILS) {
    const allowedEmails = parsePlatformAdminEmails(rawAllowlist);

    return allowedEmails.has(email.trim().toLowerCase());
  }

  assertPlatformAdmin(user: AuthenticatedUser) {
    if (!this.isPlatformAdmin(user.email)) {
      throw new ForbiddenException('Platform administrator access is required.');
    }
  }
}

export function parsePlatformAdminEmails(rawAllowlist: string | undefined) {
  return new Set(
    (rawAllowlist ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
