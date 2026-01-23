import { IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateArrivalItemDto } from './create-arrival-item.dto';
import { ArrivalType } from '@prisma/client';

export class CreateArrivalDto {
	@ApiProperty({ description: 'ID бара' })
	@IsString()
	barId: string;

	@ApiProperty({ description: 'Тип операции', enum: ArrivalType })
	@IsEnum(ArrivalType)
	type: ArrivalType;

	@ApiProperty({ description: 'Товары', type: [CreateArrivalItemDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateArrivalItemDto)
	items: CreateArrivalItemDto[];

	@ApiPropertyOptional({ description: 'Комментарий' })
	@IsOptional()
	@IsString()
	comment?: string;
}
