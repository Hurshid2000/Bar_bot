import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PinAuthDto {
	@ApiProperty({ description: 'Telegram ID пользователя', example: '123456789' })
	@IsString()
	telegramId: string;

	@ApiProperty({ description: '4-значный PIN-код', example: '1234' })
	@IsString()
	@Length(4, 4, { message: 'PIN должен содержать ровно 4 цифры' })
	@Matches(/^\d{4}$/, { message: 'PIN должен содержать только цифры' })
	pin: string;
}
