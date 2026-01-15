import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TelegramAuthDto {
	@ApiProperty({
		description: 'Telegram initData строка от Mini App',
		example: 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22John%22%7D&auth_date=1234567890&hash=...',
	})
	@IsString()
	@IsNotEmpty()
	initData: string;
}
