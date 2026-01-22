import { IsString, IsNotEmpty, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBarProductDto {
	@ApiProperty({ description: 'ID бара', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	barId: string;

	@ApiProperty({ description: 'ID продукта', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	productId: string;

	@ApiPropertyOptional({ description: 'Цена продажи в этом баре (если не указана, берётся из defaultPrice продукта)', example: 100.0, minimum: 0 })
	@IsOptional()
	@IsNumber()
	@Min(0)
	price?: number;

	@ApiPropertyOptional({ description: 'Активен ли продукт в баре', default: true })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
