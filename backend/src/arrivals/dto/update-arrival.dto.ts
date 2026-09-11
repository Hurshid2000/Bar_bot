import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateArrivalItemDto } from './create-arrival-item.dto';
import { ArrivalType } from '@prisma/client';

export class UpdateArrivalDto {
	@ApiPropertyOptional({ description: 'Тип операции', enum: ArrivalType })
	@IsOptional()
	@IsEnum(ArrivalType)
	type?: ArrivalType;

	@ApiPropertyOptional({ description: 'Товары', type: [CreateArrivalItemDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateArrivalItemDto)
	items: CreateArrivalItemDto[];

	@ApiPropertyOptional({ description: 'Комментарий' })
	@IsOptional()
	@IsString()
	comment?: string;
}
