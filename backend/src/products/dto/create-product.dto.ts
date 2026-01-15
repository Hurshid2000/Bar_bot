import {
	IsString,
	IsNotEmpty,
	IsNumber,
	Min,
	IsOptional,
	IsEnum,
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

	@ApiProperty({ description: 'Цена продажи', example: 100.0, minimum: 0 })
	@IsNumber()
	@Min(0)
	price: number;

	@ApiProperty({ description: 'ID бара', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	barId: string;

	@ApiProperty({ description: 'ID категории', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	categoryId: string;
}
