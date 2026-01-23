import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInventoryItemDto {
	@ApiProperty({ description: 'ID продукта', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	productId: string;

	@ApiProperty({ description: 'Количество товара', example: 10, minimum: 0 })
	@Type(() => Number)
	@IsNumber()
	@Min(0)
	quantity: number;
}
