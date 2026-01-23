import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateInventoryItemDto } from './create-inventory-item.dto';

export class CreateInventoryDto {
	@ApiProperty({ description: 'ID бара', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	barId: string;

	@ApiProperty({
		description: 'Список товаров для инвентаризации',
		type: [CreateInventoryItemDto],
	})
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateInventoryItemDto)
	items: CreateInventoryItemDto[];

	@ApiPropertyOptional({ description: 'Комментарий к инвентаризации' })
	@IsOptional()
	@IsString()
	comment?: string;
}
