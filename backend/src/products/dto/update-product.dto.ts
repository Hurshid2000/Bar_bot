import {
	IsString,
	IsOptional,
	IsNotEmpty,
	IsNumber,
	Min,
	IsEnum,
} from 'class-validator';
import { ProductType } from '@prisma/client';

export class UpdateProductDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string;

	@IsOptional()
	@IsString()
	barcode?: string;

	@IsOptional()
	@IsEnum(ProductType)
	type?: ProductType;

	@IsOptional()
	@IsNumber()
	@Min(0)
	costPrice?: number;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	categoryId?: string;

	@IsOptional()
	@IsString()
	imageUrl?: string;

	@IsOptional()
	@IsString()
	description?: string;
}
