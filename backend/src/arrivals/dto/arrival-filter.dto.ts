import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrivalType } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ArrivalFilterDto extends PaginationDto {
	@ApiPropertyOptional({ description: 'ID бара' })
	@IsOptional()
	@IsString()
	barId?: string;

	@ApiPropertyOptional({ description: 'Тип операции', enum: ArrivalType })
	@IsOptional()
	@IsEnum(ArrivalType)
	type?: ArrivalType;

	@ApiPropertyOptional({ description: 'Дата начала периода (ISO string)' })
	@IsOptional()
	@IsDateString()
	startDate?: string;

	@ApiPropertyOptional({ description: 'Дата конца периода (ISO string)' })
	@IsOptional()
	@IsDateString()
	endDate?: string;
}
