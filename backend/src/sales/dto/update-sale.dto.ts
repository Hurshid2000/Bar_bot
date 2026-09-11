import { IsUUID, IsNumber, IsPositive, IsInt, Min, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateSaleDto {
	@ApiPropertyOptional({ description: 'ID продукта' })
	@IsOptional()
	@IsUUID()
	productId?: string;

	@ApiPropertyOptional({ description: 'Количество' })
	@IsOptional()
	@IsInt()
	@Min(1)
	quantity?: number;

	@ApiPropertyOptional({ description: 'Цена продажи за единицу' })
	@IsOptional()
	@IsNumber()
	@IsPositive()
	price?: number;

	@ApiPropertyOptional({ description: 'Кому продал (имя покупателя)' })
	@IsOptional()
	@IsString()
	buyerName?: string;

	@ApiPropertyOptional({ description: 'Дата продажи (yyyy-MM-dd)' })
	@IsOptional()
	@Matches(DATE_FORMAT_REGEX, { message: 'date must be in format yyyy-MM-dd' })
	date?: string;
}
