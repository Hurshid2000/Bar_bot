import { IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRevenueDto {
	@IsString()
	barId: string;

	@IsDateString()
	date: string;

	@Type(() => Number)
	@IsNumber()
	@Min(0)
	cash: number;

	@Type(() => Number)
	@IsNumber()
	@Min(0)
	card: number;
}
