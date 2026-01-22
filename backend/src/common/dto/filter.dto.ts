import { IsOptional, IsString, IsEnum, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from '@prisma/client';

// Регулярное выражение для формата даты yyyy-MM-dd
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// DTO для фильтрации продуктов (используется в @Query())
export class ProductFilterDto {
	@IsOptional()
	@IsString()
	barId?: string;

	@IsOptional()
	@IsString()
	categoryId?: string;

	@IsOptional()
	@IsEnum(ProductType)
	type?: ProductType;
}

export class PurchaseFilterDto {
	@IsOptional()
	@IsString()
	barId?: string;

	@IsOptional()
	@IsString()
	@Matches(DATE_FORMAT_REGEX, {
		message: 'startDate must be in format yyyy-MM-dd',
	})
	startDate?: string;

	@IsOptional()
	@IsString()
	@Matches(DATE_FORMAT_REGEX, {
		message: 'endDate must be in format yyyy-MM-dd',
	})
	endDate?: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 20;
}
