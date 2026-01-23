import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
	@ApiProperty({ description: 'ID бара' })
	@IsString()
	barId: string;

	@ApiProperty({ description: 'Товары в заказе', type: [CreateOrderItemDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateOrderItemDto)
	items: CreateOrderItemDto[];

	@ApiPropertyOptional({ description: 'Комментарий к заказу' })
	@IsOptional()
	@IsString()
	comment?: string;
}
