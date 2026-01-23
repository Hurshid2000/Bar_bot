import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InventoryFilterDto {
	@ApiPropertyOptional({ description: 'ID бара для фильтрации' })
	@IsOptional()
	@IsString()
	barId?: string;

	@ApiPropertyOptional({ description: 'Начальная дата (YYYY-MM-DD)' })
	@IsOptional()
	@IsString()
	startDate?: string;

	@ApiPropertyOptional({ description: 'Конечная дата (YYYY-MM-DD)' })
	@IsOptional()
	@IsString()
	endDate?: string;

	@ApiPropertyOptional({ description: 'Номер страницы', default: 1, minimum: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@ApiPropertyOptional({ description: 'Количество элементов на странице', default: 20, minimum: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	limit?: number;
}
