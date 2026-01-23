import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
	@ApiPropertyOptional({ description: 'Статус заказа', enum: OrderStatus })
	@IsOptional()
	@IsEnum(OrderStatus)
	status?: OrderStatus;

	@ApiPropertyOptional({ description: 'Комментарий к заказу' })
	@IsOptional()
	@IsString()
	comment?: string;
}
