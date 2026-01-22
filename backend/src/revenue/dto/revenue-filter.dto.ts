import { IsOptional, IsString, Matches, IsInt, Min, Max, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

// Регулярное выражение для формата даты yyyy-MM-dd
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// DTO для фильтрации revenue (используется в @Query() в revenue.controller.ts)
// Важно: ValidationPipe с whitelist:true и forbidNonWhitelisted:true требует явного определения всех полей
export class RevenueFilterDto {
	@IsOptional()
	@IsUUID('4', { message: 'barId must be a valid UUID' })
	barId?: string;

	@IsOptional()
	@IsString()
	@Matches(DATE_FORMAT_REGEX, {
		message: 'date must be in format yyyy-MM-dd',
	})
	date?: string;

	@IsOptional()
	@IsDateString({}, { message: 'startDate must be a valid date string' })
	startDate?: string;

	@IsOptional()
	@IsDateString({}, { message: 'endDate must be a valid date string' })
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
