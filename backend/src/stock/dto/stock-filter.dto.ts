import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ProductType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StockFilterDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsUUID()
	barId?: string;

	@ApiPropertyOptional({ enum: ProductType })
	@IsOptional()
	@IsEnum(ProductType)
	productType?: ProductType;
}
