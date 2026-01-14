import { IsString, IsDateString, IsNumber, Min } from 'class-validator';

export class CreateRevenueDto {
	@IsString()
	barId: string;

	@IsDateString()
	date: string;

	@IsNumber()
	@Min(0)
	cash: number;

	@IsNumber()
	@Min(0)
	card: number;
}
