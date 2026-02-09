import { Controller, Post, Body, Patch, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { PinAuthDto } from './dto/pin-auth.dto';
import { Public } from '../guards/decorators/public.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly usersService: UsersService,
	) {}

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

	@Public()
	@Post('pin')
	@ApiOperation({ summary: 'Авторизация по PIN-коду (Desktop)' })
	@ApiResponse({ status: 200, description: 'Успешная авторизация' })
	@ApiResponse({ status: 401, description: 'Неверный PIN или пользователь не найден' })
	async authenticateWithPin(@Body() pinAuthDto: PinAuthDto) {
		return this.authService.authenticateWithPin(pinAuthDto);
	}

	@Patch('pin')
	@ApiBearerAuth('JWT-auth')
	@ApiOperation({ summary: 'Установить или обновить PIN-код' })
	@ApiResponse({ status: 200, description: 'PIN-код обновлен' })
	async setPin(@Request() req: any, @Body() body: { pin: string }) {
		const userId = req.user.id;
		await this.usersService.setPin(userId, body.pin);
		return { message: 'PIN-код успешно установлен' };
	}
}
