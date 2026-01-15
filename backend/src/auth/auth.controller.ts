import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { Public } from '../guards/decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RoleType } from '@prisma/client';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
	) {}

	@Public()
	@Post('telegram')
	async authenticate(@Body() telegramAuthDto: TelegramAuthDto) {
		return this.authService.authenticate(telegramAuthDto);
	}

	// ВРЕМЕННЫЙ ЭНДПОИНТ ДЛЯ ТЕСТИРОВАНИЯ (только для разработки!)
	// Удалить в продакшене!
	@Public()
	@Post('test')
	async testAuth(@Body() body: { telegramId: string; name: string; role?: RoleType }) {
		const { telegramId, name, role } = body;

		// Находим или создаем пользователя
		let user = await this.usersService.findByTelegramId(telegramId);

		if (!user) {
			user = await this.usersService.create({
				telegramId,
				name,
				role: role || RoleType.WORKER,
			});
		}

		// Генерируем JWT
		const payload = {
			sub: user.id,
			role: user.role,
		};

		const accessToken = this.jwtService.sign(payload, {
			expiresIn: '7d',
		});

		return {
			accessToken,
			user: {
				id: user.id,
				role: user.role,
				name: user.name,
			},
		};
	}
}
