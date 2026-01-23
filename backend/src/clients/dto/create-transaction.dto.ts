import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ClientTransactionType } from '@prisma/client';

export class CreateTransactionDto {
	@ApiProperty({ description: 'ID клиента', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	clientId: string;

	@ApiProperty({
		description: 'Тип операции',
		enum: ClientTransactionType,
		example: ClientTransactionType.DEPOSIT,
	})
	@IsEnum(ClientTransactionType)
	type: ClientTransactionType;

	@ApiProperty({ description: 'Сумма операции', example: 1000, minimum: 0.01 })
	@Type(() => Number)
	@IsNumber()
	@Min(0.01)
	amount: number;

	@ApiPropertyOptional({ description: 'Комментарий к операции' })
	@IsOptional()
	@IsString()
	comment?: string;
}
