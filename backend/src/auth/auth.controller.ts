import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { Public } from '../guards/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Public()
	@Post('telegram')
	@ApiOperation({ summary: 'Авторизация через Telegram Mini App' })
	@ApiResponse({
		status: 200,
		description: 'Успешная авторизация',
		schema: {
			example: {
				accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
				user: {
					id: 'uuid',
					telegramId: '123456789',
					name: 'Иван Иванов',
					role: 'WORKER',
				},
			},
		},
	})
	@ApiResponse({ status: 401, description: 'Неверные данные Telegram' })
	async authenticate(@Body() telegramAuthDto: TelegramAuthDto) {
		return this.authService.authenticate(telegramAuthDto);
	}
}
