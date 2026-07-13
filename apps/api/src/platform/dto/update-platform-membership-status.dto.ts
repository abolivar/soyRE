import { MembershipStatus } from '@soyre/database';
import { IsEnum } from 'class-validator';

export class UpdatePlatformMembershipStatusDto {
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;
}
