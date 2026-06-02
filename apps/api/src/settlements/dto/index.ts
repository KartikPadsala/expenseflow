import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementDto {
  @ApiProperty()
  @IsString()
  payeeId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ default: 'USD' })
  @IsString()
  currency!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['CASH','BANK_TRANSFER','PAYPAL','STRIPE','WISE','INTERAC','OTHER'])
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
