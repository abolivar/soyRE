import { MembershipRole } from '@soyre/database';
import { IsEnum } from 'class-validator';

export class UpdatePlatformMembershipRoleDto {
  @IsEnum(MembershipRole)
  role!: MembershipRole;
}
