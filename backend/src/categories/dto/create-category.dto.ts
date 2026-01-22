import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';

export class CreateCategoryDto {
	@ApiProperty({ description: 'Название категории', example: 'Напитки' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiPropertyOptional({ 
		description: 'Тип категории (для каких продуктов)', 
		enum: ProductType,
		default: ProductType.PRODUCT 
	})
	@IsOptional()
	@IsEnum(ProductType)
	type?: ProductType;
}
