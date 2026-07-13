# Users Module

Initial identity module for soyRE users and organization membership validation.

## Scope

- Register an organization owner.
- Login and logout with httpOnly cookies.
- Read current authenticated user and organization memberships.
- List users in the active organization.
- Create pending or active users in an organization.
- Validate pending memberships.
- Suspend memberships.
- Change membership roles.
- Administer organizations and users from the internal platform backoffice during
  alpha.

## Rules

- Authentication belongs to the API.
- Users do not access the product without at least one active membership.
- Organization access is evaluated from memberships.
- Only `OWNER` and `ADMIN` can create, validate, suspend, or change users.
- `OWNER` membership changes must not leave the organization without an active owner.
- Platform backoffice access is controlled by `PLATFORM_ADMIN_EMAILS`, not by
  organization roles.

## Out of Scope

- Email delivery.
- Password reset flow.
- MFA.
- External identity providers.
- Fine-grained property permissions.
- Billing and customer success workflows for the SaaS owner.
