import {
	Injectable,
	UnauthorizedException,
	BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import {
	parseInitData,
	verifyTelegramSignature,
} from './utils/telegram.util';

export interface AuthResponse {
	accessToken: string;
	user: {
		id: string;
		role: string;
	};
}

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
		private configService: ConfigService,
	) {}

	async authenticate(telegramAuthDto: TelegramAuthDto): Promise<AuthResponse> {
		const { initData } = telegramAuthDto;

		// Шаг 1: Парсинг initData
		let parsedData;
		try {
			parsedData = parseInitData(initData);
		} catch (error) {
			throw new BadRequestException('Invalid initData format');
		}

		// Шаг 2: Верификация Telegram подписи
		const botToken = this.configService.get<string>('BOT_TOKEN');
		if (!botToken) {
			throw new Error('BOT_TOKEN is not configured');
		}

		if (!verifyTelegramSignature(initData, botToken)) {
			throw new UnauthorizedException('Invalid Telegram signature');
		}

		// Шаг 3: Получение данных пользователя из Telegram
		if (!parsedData.user) {
			throw new BadRequestException('User data not found in initData');
		}

		const telegramUser = parsedData.user;
		const telegramId = telegramUser.id.toString();
		const name =
			`${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`.trim() ||
			telegramUser.username ||
			'User';

		// Шаг 4: Поиск или создание пользователя
		let user = await this.usersService.findByTelegramId(telegramId);

		if (!user) {
			// Создаем нового пользователя
			user = await this.usersService.create({
				telegramId,
				name,
			});
		} else {
			// Обновляем имя пользователя (если изменилось)
			if (user.name !== name) {
				user = await this.usersService.update(user.id, { name });
			}
		}

		// Шаг 5: Генерация JWT токена
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
			},
		};
	}
}
