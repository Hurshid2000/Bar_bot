import { IsOptional, IsUUID, IsString, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class SaleFilterDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsUUID()
	barId?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@Matches(DATE_FORMAT_REGEX, { message: 'startDate must be in format yyyy-MM-dd' })
	startDate?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@Matches(DATE_FORMAT_REGEX, { message: 'endDate must be in format yyyy-MM-dd' })
	endDate?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@Matches(DATE_FORMAT_REGEX, { message: 'date must be in format yyyy-MM-dd' })
	date?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional()
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 50;
}
