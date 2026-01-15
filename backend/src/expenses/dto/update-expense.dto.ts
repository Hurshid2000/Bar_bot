import { IsNumber, Min, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateExpenseDto {
	@IsOptional()
	@IsNumber()
	@Min(0)
	amount?: number;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	description?: string;
}
