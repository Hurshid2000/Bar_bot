import { IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBarProductDto {
	@ApiPropertyOptional({ description: 'Цена продажи в этом баре', example: 100.0, minimum: 0 })
	@IsOptional()
	@IsNumber()
	@Min(0)
	price?: number;

	@ApiPropertyOptional({ description: 'Активен ли продукт в баре' })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;

	@ApiPropertyOptional({ description: 'Закреплён ли продукт в начале списка' })
	@IsOptional()
	@IsBoolean()
	isPinned?: boolean;
}
