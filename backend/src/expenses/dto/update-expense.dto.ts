import { IsString, IsNumber, Min, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateExpenseDto {
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	amount?: number;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	description?: string;

	@IsOptional()
	@IsString()
	@Matches(DATE_FORMAT_REGEX, { message: 'date must be in format yyyy-MM-dd' })
	date?: string;
}
