import {
	Injectable,
	UnauthorizedException,
	BadRequestException,
	Logger,
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
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
		private configService: ConfigService,
	) {}

	async authenticate(telegramAuthDto: TelegramAuthDto): Promise<AuthResponse> {
		const { initData } = telegramAuthDto;

		console.log('[AUTH] Начало авторизации через Telegram');

		// Шаг 1: Парсинг initData
		let parsedData;
		try {
			parsedData = parseInitData(initData);
			console.log('[AUTH] InitData успешно распарсен');
		} catch (error) {
			console.error('[AUTH] Ошибка парсинга initData:', error);
			throw new BadRequestException('Invalid initData format');
		}

		// Шаг 2: Верификация Telegram подписи
		const botToken = this.configService.get<string>('BOT_TOKEN');
		if (!botToken) {
			console.error('[AUTH] BOT_TOKEN не настроен!');
			throw new Error('BOT_TOKEN is not configured');
		}

		// Режим разработки: пропуск проверки подписи
		const skipVerification =
			this.configService.get<string>('SKIP_TELEGRAM_VERIFICATION') ===
			'true';
		const nodeEnv = this.configService.get<string>('NODE_ENV');

		console.log('[AUTH] Проверка режима:', {
			skipVerification,
			nodeEnv,
			hasSkipVar: !!this.configService.get<string>('SKIP_TELEGRAM_VERIFICATION'),
		});

		if (skipVerification || nodeEnv === 'development') {
			const message = '⚠️  Пропуск проверки подписи Telegram (режим разработки)';
			this.logger.warn(message);
			console.log('[AUTH]', message);
		} else {
			console.log('[AUTH] Проверка подписи Telegram...');
			const isValid = verifyTelegramSignature(initData, botToken, true);
			if (!isValid) {
				const errorMsg = '❌ Неверная подпись Telegram';
				this.logger.error(errorMsg);
				console.error('[AUTH]', errorMsg);
				console.error('[AUTH] InitData (первые 100 символов):', initData.substring(0, 100));
				throw new UnauthorizedException('Invalid Telegram signature');
			}
			const successMsg = '✅ Подпись Telegram проверена успешно';
			this.logger.log(successMsg);
			console.log('[AUTH]', successMsg);
		}

		// Шаг 3: Получение данных пользователя из Telegram
		if (!parsedData.user) {
			console.error('[AUTH] Данные пользователя не найдены в initData');
			throw new BadRequestException('User data not found in initData');
		}

		const telegramUser = parsedData.user;
		const telegramId = telegramUser.id.toString();
		const name =
			`${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`.trim() ||
			telegramUser.username ||
			'User';

		console.log('[AUTH] Данные пользователя:', { telegramId, name });

		// Шаг 4: Поиск или создание пользователя
		let user = await this.usersService.findByTelegramId(telegramId);

		if (!user) {
			console.log('[AUTH] Создание нового пользователя');
			user = await this.usersService.create({
				telegramId,
				name,
			});
		} else {
			console.log('[AUTH] Пользователь найден:', user.id);
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

		console.log('[AUTH] Авторизация успешна для пользователя:', user.id);

		return {
			accessToken,
			user: {
				id: user.id,
				role: user.role,
			},
		};
	}
}
