import { IsOptional, IsString, Matches, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

// Регулярное выражение для формата даты yyyy-MM-dd
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// DTO для фильтрации expenses (используется в @Query() в expenses.controller.ts)
export class ExpenseFilterDto {
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
