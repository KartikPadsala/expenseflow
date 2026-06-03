import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementDto {
  @ApiProperty()
  @IsString()
  payeeId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  @Max(1_000_000_000)
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

export class BulkSettleItemDto {
  @IsString() payeeId!: string;
  @IsNumber() @Min(0.01) @Max(1_000_000_000) amount!: number;
  @IsString() currency!: string;
  @IsOptional() @IsString() method?: string;
}

export class BulkSettleDto {
  @IsString() groupId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => BulkSettleItemDto) settlements!: BulkSettleItemDto[];
}
