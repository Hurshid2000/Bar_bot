import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
	@ApiProperty({ description: 'ID бара', example: 'uuid' })
	@IsString()
	@IsNotEmpty()
	barId: string;

	@ApiProperty({ description: 'Имя клиента', example: 'Иван Иванов' })
	@IsString()
	@IsNotEmpty()
	name: string;

	@ApiPropertyOptional({ description: 'Номер телефона', example: '+998901234567' })
	@IsOptional()
	@IsString()
	phone?: string;
}
