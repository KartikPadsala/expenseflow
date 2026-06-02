import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupType } from '@expenseflow/shared';

export class CreateGroupDto {
  @ApiProperty({ example: 'Europe Trip 2024' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ['HOME','TRIP','COUPLE','OFFICE','OTHER'] })
  @IsOptional()
  @IsEnum(['HOME','TRIP','COUPLE','OFFICE','OTHER'])
  type?: GroupType;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateGroupDto extends CreateGroupDto {}

export class AddMemberDto {
  @ApiProperty()
  @IsString()
  userId!: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'MEMBER'] })
  @IsEnum(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER';
}
