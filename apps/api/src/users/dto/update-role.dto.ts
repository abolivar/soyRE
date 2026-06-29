import { MembershipRole } from '@soyre/database';
import { IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @IsEnum(MembershipRole)
  role!: MembershipRole;
}
