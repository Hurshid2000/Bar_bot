import {
	IsString,
	IsNotEmpty,
	IsNumber,
	Min,
	IsOptional,
	IsEnum,
	IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
	@ApiProperty({ description: 'Название продукта', example: 'Кока-Кола 0.5л' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiPropertyOptional({ description: 'Штрих-код продукта', example: '4600051000057' })
	@IsOptional()
	@IsString()
	barcode?: string;

	@ApiPropertyOptional({ 
		description: 'Тип продукта', 
		enum: ProductType,
		example: ProductType.PRODUCT 
	})
	@IsOptional()
	@IsEnum(ProductType)
	type?: ProductType;

	@ApiProperty({ description: 'Себестоимость', example: 50.0, minimum: 0 })
	@IsNumber()
	@Min(0)
	costPrice: number;

	@ApiProperty({ description: 'ID категории', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	categoryId: string;

	@ApiPropertyOptional({ description: 'URL изображения продукта' })
	@IsOptional()
	@IsString()
	imageUrl?: string;

	@ApiPropertyOptional({ description: 'Описание продукта' })
	@IsOptional()
	@IsString()
	description?: string;
}
