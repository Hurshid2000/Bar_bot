import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientDto {
	@ApiPropertyOptional({ description: 'Имя клиента' })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string;

	@ApiPropertyOptional({ description: 'Номер телефона' })
	@IsOptional()
	@IsString()
	phone?: string;

	@ApiPropertyOptional({ description: 'Активность клиента' })
	@IsOptional()
	isActive?: boolean;
}
