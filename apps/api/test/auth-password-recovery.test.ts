import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MembershipStatus } from '@soyre/database';
import {
  AuthService,
  PASSWORD_RECOVERY_RESPONSE_MESSAGE,
} from '../src/auth/auth.service.js';

function createAuthService(prisma: unknown) {
  return new AuthService({} as never, {} as never, prisma as never);
}

describe('AuthService password recovery', () => {
  it('returns a generic response when the user does not exist', async () => {
    const service = createAuthService({
      auditLog: {
        create: async () => {
          assert.fail('audit log should not be created for unknown emails');
        },
      },
      user: {
        findUnique: async () => null,
      },
    });

    const result = await service.requestPasswordRecovery({
      email: 'missing@example.com',
    });

    assert.deepEqual(result, {
      message: PASSWORD_RECOVERY_RESPONSE_MESSAGE,
      ok: true,
    });
  });

  it('records an internal audit log when the user exists', async () => {
    let auditData: unknown;
    const userId = '00000000-0000-4000-8000-000000000001';
    const organizationId = '00000000-0000-4000-8000-000000000002';
    const service = createAuthService({
      auditLog: {
        create: async ({ data }: { data: unknown }) => {
          auditData = data;
        },
      },
      user: {
        findUnique: async () => ({
          id: userId,
          memberships: [
            {
              organizationId,
              status: MembershipStatus.ACTIVE,
            },
          ],
        }),
      },
    });

    const result = await service.requestPasswordRecovery({
      email: ' Owner@Example.com ',
    });

    assert.deepEqual(result, {
      message: PASSWORD_RECOVERY_RESPONSE_MESSAGE,
      ok: true,
    });
    assert.deepEqual(auditData, {
      action: 'auth.password_recovery.request',
      metadata: {
        email: 'owner@example.com',
        source: 'login',
      },
      organizationId,
      targetId: userId,
      targetType: 'user',
    });
  });
});
