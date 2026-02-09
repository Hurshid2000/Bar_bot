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
import { PinAuthDto } from './dto/pin-auth.dto';
import {
	parseInitData,
	verifyTelegramSignature,
	verifyAuthDate,
} from './utils/telegram.util';

export interface AuthResponse {
	accessToken: string;
	user: {
		id: string;
		telegramId: string;
		name: string;
		role: string;
		createdAt: string;
		updatedAt: string;
		bars?: Array<{
			id: string;
			userId: string;
			barId: string;
			bar?: {
				id: string;
				name: string;
				isActive: boolean;
				createdAt: string;
			};
		}>;
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
			console.log('[AUTH] ⚠️  Пропуск проверки auth_date (режим разработки)');
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

			// Проверка auth_date (защита от replay-атак)
			const isAuthDateValid = verifyAuthDate(parsedData.authDate);
			if (!isAuthDateValid) {
				const errorMsg = '❌ Неверный auth_date (данные устарели или отсутствуют)';
				this.logger.error(errorMsg);
				console.error('[AUTH]', errorMsg);
				console.error('[AUTH] auth_date:', parsedData.authDate);
				throw new UnauthorizedException('Invalid or expired auth_date');
			}
			console.log('[AUTH] ✅ auth_date проверен успешно');
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

		// Получаем полные данные пользователя с барами для фронтенда
		const userWithBars = await this.usersService.findOne(user.id);

		return {
			accessToken,
			user: {
				id: userWithBars.id,
				telegramId: userWithBars.telegramId,
				name: userWithBars.name,
				role: userWithBars.role,
				createdAt: userWithBars.createdAt.toISOString(),
				updatedAt: userWithBars.updatedAt.toISOString(),
				bars: userWithBars.bars.map((ub) => ({
					id: ub.id,
					userId: ub.userId,
					barId: ub.barId,
					bar: ub.bar
						? {
								id: ub.bar.id,
								name: ub.bar.name,
								isActive: ub.bar.isActive,
								createdAt: ub.bar.createdAt.toISOString(),
							}
						: undefined,
				})),
			},
		};
	}

	async authenticateWithPin(pinAuthDto: PinAuthDto): Promise<AuthResponse> {
		const { telegramId, pin } = pinAuthDto;

		console.log('[AUTH/PIN] Авторизация по PIN для telegramId:', telegramId);

		// Шаг 1: Поиск пользователя
		const user = await this.usersService.findByTelegramId(telegramId);

		if (!user) {
			console.log('[AUTH/PIN] Пользователь не найден:', telegramId);
			throw new UnauthorizedException('Пользователь не найден. Зарегистрируйтесь через Telegram Mini App.');
		}

		// Шаг 2: Проверка PIN-кода
		if (!user.pin) {
			console.log('[AUTH/PIN] PIN не установлен для пользователя:', user.id);
			throw new UnauthorizedException('PIN-код не установлен. Установите PIN через Telegram Mini App.');
		}

		if (user.pin !== pin) {
			console.log('[AUTH/PIN] Неверный PIN для пользователя:', user.id);
			throw new UnauthorizedException('Неверный PIN-код');
		}

		// Шаг 3: Генерация JWT токена
		const payload = {
			sub: user.id,
			role: user.role,
		};

		const accessToken = this.jwtService.sign(payload, {
			expiresIn: '7d',
		});

		console.log('[AUTH/PIN] Авторизация успешна для пользователя:', user.id);

		// Получаем полные данные пользователя с барами
		const userWithBars = await this.usersService.findOne(user.id);

		return {
			accessToken,
			user: {
				id: userWithBars.id,
				telegramId: userWithBars.telegramId,
				name: userWithBars.name,
				role: userWithBars.role,
				createdAt: userWithBars.createdAt.toISOString(),
				updatedAt: userWithBars.updatedAt.toISOString(),
				bars: userWithBars.bars.map((ub) => ({
					id: ub.id,
					userId: ub.userId,
					barId: ub.barId,
					bar: ub.bar
						? {
								id: ub.bar.id,
								name: ub.bar.name,
								isActive: ub.bar.isActive,
								createdAt: ub.bar.createdAt.toISOString(),
							}
						: undefined,
				})),
			},
		};
	}
}
