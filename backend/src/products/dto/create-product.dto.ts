import {
	IsString,
	IsNotEmpty,
	IsNumber,
	Min,
	IsOptional,
	IsEnum,
} from 'class-validator';
import { ProductType } from '@prisma/client';

export class CreateProductDto {
	@IsString()
	@IsNotEmpty()
	name: string;

	@IsOptional()
	@IsString()
	barcode?: string;

	@IsOptional()
	@IsEnum(ProductType)
	type?: ProductType;

	@IsNumber()
	@Min(0)
	costPrice: number;

	@IsNumber()
	@Min(0)
	price: number;

	@IsString()
	@IsNotEmpty()
	barId: string;

	@IsString()
	@IsNotEmpty()
	categoryId: string;
}
