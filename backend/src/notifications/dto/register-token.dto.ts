import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterTokenDto {
	@ApiProperty({ description: 'Push subscription token', example: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...' })
	@IsString()
	@IsNotEmpty()
	token: string;

	@ApiPropertyOptional({ description: 'Device information', example: 'Chrome on Windows' })
	@IsOptional()
	@IsString()
	deviceInfo?: string;
}
