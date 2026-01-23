import { IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArrivalItemDto {
	@ApiProperty({ description: 'ID продукта' })
	@IsString()
	productId: string;

	@ApiProperty({ description: 'Количество товара', minimum: 1 })
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	quantity: number;
}
