import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';

export class UpdateCategoryDto {
	@ApiPropertyOptional({ description: 'Название категории' })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string;

	@ApiPropertyOptional({ 
		description: 'Тип категории', 
		enum: ProductType 
	})
	@IsOptional()
	@IsEnum(ProductType)
	type?: ProductType;
}
