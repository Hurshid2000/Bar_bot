import { IsUUID, IsNumber, IsPositive, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSaleDto {
	@ApiProperty({ description: 'ID бара' })
	@IsUUID()
	barId: string;

	@ApiProperty({ description: 'ID продукта' })
	@IsUUID()
	productId: string;

	@ApiProperty({ description: 'Количество' })
	@IsInt()
	@Min(1)
	quantity: number;

	@ApiProperty({ description: 'Цена продажи за единицу' })
	@IsNumber()
	@IsPositive()
	price: number;
}
