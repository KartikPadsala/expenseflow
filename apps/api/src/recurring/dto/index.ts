import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecurringParticipantDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  owedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sharePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  shares?: number;
}

export class CreateRecurringExpenseDto {
  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ default: 'USD' })
  @IsString()
  currency!: string;

  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] })
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  frequency!: string;

  @ApiProperty({ enum: ['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES', 'EXACT', 'MULTI_PAYER'] })
  @IsEnum(['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES', 'EXACT', 'MULTI_PAYER'])
  splitMethod!: string;

  @ApiProperty({ description: 'ISO date string for first occurrence' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'ISO date string for last occurrence (optional)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [RecurringParticipantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringParticipantDto)
  participants!: RecurringParticipantDto[];
}

export class UpdateRecurringExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] })
  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecurringParticipantDto)
  participants?: RecurringParticipantDto[];
}
