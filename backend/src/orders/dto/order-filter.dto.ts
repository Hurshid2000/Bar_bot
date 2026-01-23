import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class OrderFilterDto extends PaginationDto {
	@ApiPropertyOptional({ description: 'ID бара' })
	@IsOptional()
	@IsString()
	barId?: string;

	@ApiPropertyOptional({ description: 'Статус заказа', enum: OrderStatus })
	@IsOptional()
	@IsEnum(OrderStatus)
	status?: OrderStatus;

	@ApiPropertyOptional({ description: 'Дата начала периода (ISO string)' })
	@IsOptional()
	@IsDateString()
	startDate?: string;

	@ApiPropertyOptional({ description: 'Дата конца периода (ISO string)' })
	@IsOptional()
	@IsDateString()
	endDate?: string;
}
