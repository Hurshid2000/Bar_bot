import { IsOptional, IsString, IsDateString, IsArray } from 'class-validator';

export class ReportPeriodDto {
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

export class CompareBarsDto {
	@IsArray()
	@IsString({ each: true })
	barIds: string[];

	@IsDateString()
	startDate: string;

	@IsDateString()
	endDate: string;
}
