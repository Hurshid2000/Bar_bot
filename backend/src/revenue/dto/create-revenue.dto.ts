import { IsString, IsDateString, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRevenueDto {
	@IsString()
	barId: string;

	@IsDateString()
	date: string;

	// cash и card опциональны - можно обновлять только одно поле
	// При upsert: если не передано, сохраняется существующее значение (или 0 для новой записи)
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	cash?: number;

	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	card?: number;
}
