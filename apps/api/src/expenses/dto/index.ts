import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SplitMethod } from '@expenseflow/shared';

export class ExpenseParticipantDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
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

export class CreateExpenseDto {
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

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: ['EQUAL','UNEQUAL','PERCENTAGE','SHARES','EXACT','MULTI_PAYER'] })
  @IsEnum(['EQUAL','UNEQUAL','PERCENTAGE','SHARES','EXACT','MULTI_PAYER'])
  splitMethod!: SplitMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseParticipantDto)
  participants!: ExpenseParticipantDto[];
}

export class UpdateExpenseDto extends CreateExpenseDto {}

export class ListExpensesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Search in description and notes' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by payer user ID' })
  @IsOptional()
  @IsString()
  paidById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Minimum expense amount' })
  @IsOptional()
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum expense amount' })
  @IsOptional()
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
