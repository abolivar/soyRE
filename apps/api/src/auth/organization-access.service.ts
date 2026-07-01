import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole, MembershipStatus, OrganizationStatus } from '@soyre/database';
import type { AuthenticatedMembership, AuthenticatedUser } from './auth.types.js';

type OrganizationIdentity = Pick<
  AuthenticatedMembership,
  'organizationId' | 'organizationName' | 'organizationSlug'
>;

export type OrganizationAccessOptions = {
  roles?: ReadonlySet<MembershipRole>;
  permission?: string;
};

@Injectable()
export class OrganizationAccessService {
  resolveMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
    options: OrganizationAccessOptions = {},
  ) {
    const membership = organizationId
      ? auth.memberships.find(
          (item) =>
            item.organizationId === organizationId &&
            this.isActiveMembership(item),
        )
      : auth.memberships.find((item) => this.isActiveMembership(item));

    if (!membership) {
      throw new ForbiddenException('No active membership for this organization.');
    }

    if (options.roles && !options.roles.has(membership.role)) {
      throw new ForbiddenException(
        options.permission
          ? `${options.permission} permission is required.`
          : 'Required organization role is missing.',
      );
    }

    return membership;
  }

  activeMemberships(
    auth: AuthenticatedUser,
    roles?: ReadonlySet<MembershipRole>,
  ) {
    return auth.memberships.filter(
      (membership) =>
        this.isActiveMembership(membership) &&
        (!roles || roles.has(membership.role)),
    );
  }

  organizationIds(
    auth: AuthenticatedUser,
    roles?: ReadonlySet<MembershipRole>,
  ) {
    const organizationIds = this.activeMemberships(auth, roles).map(
      (membership) => membership.organizationId,
    );

    if (organizationIds.length === 0) {
      throw new ForbiddenException('No active membership for this organization.');
    }

    return organizationIds;
  }

  serializeOrganization(membership: OrganizationIdentity) {
    return {
      id: membership.organizationId,
      name: membership.organizationName,
      slug: membership.organizationSlug,
    };
  }

  isActiveMembership(membership: AuthenticatedMembership) {
    return (
      membership.status === MembershipStatus.ACTIVE &&
      membership.organizationStatus === OrganizationStatus.ACTIVE
    );
  }
}
