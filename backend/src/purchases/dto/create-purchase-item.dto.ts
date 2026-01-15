import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseItemDto {
	@IsString()
	@IsNotEmpty()
	productId: string;

	@Type(() => Number)
	@IsNumber()
	@Min(1)
	quantity: number;
}
