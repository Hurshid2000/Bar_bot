import { IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateRevenueDto {
	@IsOptional()
	@IsNumber()
	@Min(0)
	cash?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	card?: number;
}
