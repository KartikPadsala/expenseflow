import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CURRENCIES, SUPPORTED_LANGUAGES } from '@expenseflow/shared';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(Object.keys(CURRENCIES))
  defaultCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LANGUAGES.map((l) => l.code))
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}
