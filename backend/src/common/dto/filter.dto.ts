import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ProductType } from '@prisma/client';

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

export class RevenueFilterDto {
	@IsOptional()
	@IsString()
	barId?: string;

	@IsOptional()
	@IsDateString()
	startDate?: string;

	@IsOptional()
	@IsDateString()
	endDate?: string;
}

export class ExpenseFilterDto {
	@IsOptional()
	@IsString()
	barId?: string;

	@IsOptional()
	@IsDateString()
	startDate?: string;

	@IsOptional()
	@IsDateString()
	endDate?: string;
}

export class PurchaseFilterDto {
	@IsOptional()
	@IsString()
	barId?: string;

	@IsOptional()
	@IsDateString()
	startDate?: string;

	@IsOptional()
	@IsDateString()
	endDate?: string;
}
