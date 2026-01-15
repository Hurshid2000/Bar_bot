import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
	@IsString()
	@IsNotEmpty()
	barId: string;

	@Type(() => Number)
	@IsNumber()
	@Min(0)
	amount: number;

	@IsString()
	@IsNotEmpty()
	description: string;
}
