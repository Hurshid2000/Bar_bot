import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as TelegramBot from 'node-telegram-bot-api';
import { RoleType } from '@prisma/client';

@Injectable()
export class NotificationsService implements OnModuleInit {
	private readonly logger = new Logger(NotificationsService.name);
	private bot: TelegramBot | null = null;

	constructor(
		private prisma: PrismaService,
		private configService: ConfigService,
	) {
		this.initBot();
	}

	onModuleInit() {
		const token = this.configService.get<string>('BOT_TOKEN');
		this.logger.log(`Telegram notifications: BOT_TOKEN ${token ? 'present (bot ' + (this.bot ? 'OK)' : 'failed to init)') : 'MISSING — set BOT_TOKEN in backend/.env'}`);
	}

	private initBot() {
		const botToken = this.configService.get<string>('BOT_TOKEN');
		if (!botToken) {
			this.logger.warn('BOT_TOKEN not configured. Telegram notifications will not work.');
			this.bot = null;
			return;
		}
		try {
			this.bot = new TelegramBot(botToken, { polling: false });
			this.logger.log('Telegram Bot initialized successfully');
		} catch (error) {
			this.logger.error('Failed to initialize Telegram Bot:', error);
			this.bot = null;
		}
	}

	/**
	 * Регистрация токена устройства для пользователя
	 */
	async registerToken(userId: string, token: string, deviceInfo?: string) {
		// Проверяем, существует ли уже такой токен
		const existingToken = await this.prisma.pushToken.findUnique({
			where: { token },
		});

		if (existingToken) {
			// Если токен принадлежит другому пользователю, обновляем его
			if (existingToken.userId !== userId) {
				return this.prisma.pushToken.update({
					where: { token },
					data: {
						userId,
						deviceInfo: deviceInfo || existingToken.deviceInfo,
					},
				});
			}
			// Если токен уже принадлежит этому пользователю, обновляем deviceInfo
			return this.prisma.pushToken.update({
				where: { token },
				data: {
					deviceInfo: deviceInfo || existingToken.deviceInfo,
				},
			});
		}

		// Создаем новый токен
		return this.prisma.pushToken.create({
			data: {
				userId,
				token,
				deviceInfo,
			},
		});
	}

	/**
	 * Удаление токена устройства
	 */
	async unregisterToken(userId: string, token: string) {
		return this.prisma.pushToken.deleteMany({
			where: {
				userId,
				token,
			},
		});
	}

	/**
	 * Полная диагностика системы уведомлений — проверяет всё и отправляет тестовое сообщение админу.
	 */
	async diagnose(): Promise<any> {
		const steps: Array<{ step: string; status: string; detail?: any }> = [];

		// 1. Проверка BOT_TOKEN
		const botToken = this.configService.get<string>('BOT_TOKEN');
		steps.push({
			step: '1. BOT_TOKEN в env',
			status: botToken ? 'OK' : 'FAIL',
			detail: botToken
				? `Токен найден (${botToken.slice(0, 6)}...${botToken.slice(-4)})`
				: 'BOT_TOKEN отсутствует в переменных окружения. Проверьте .env файл.',
		});

		// 2. Проверка инициализации бота
		steps.push({
			step: '2. Инициализация TelegramBot',
			status: this.bot ? 'OK' : 'FAIL',
			detail: this.bot ? 'Бот инициализирован' : 'Бот не инициализирован (this.bot = null)',
		});

		// 3. Проверяем getMe (валидность токена)
		let getMeResult: any = null;
		if (this.bot) {
			try {
				getMeResult = await this.bot.getMe();
				steps.push({
					step: '3. Telegram getMe (валидность токена)',
					status: 'OK',
					detail: { username: getMeResult.username, id: getMeResult.id, name: getMeResult.first_name },
				});
			} catch (error: any) {
				steps.push({
					step: '3. Telegram getMe (валидность токена)',
					status: 'FAIL',
					detail: error?.message || String(error),
				});
			}
		} else {
			steps.push({ step: '3. Telegram getMe', status: 'SKIP', detail: 'Бот не инициализирован' });
		}

		// 4. Список пользователей в БД
		const users = await this.prisma.user.findMany({
			select: { id: true, name: true, telegramId: true, role: true },
			orderBy: { role: 'asc' },
		});
		steps.push({
			step: '4. Пользователи в БД',
			status: users.length > 0 ? 'OK' : 'WARN',
			detail: users.map((u) => ({ id: u.id, name: u.name, telegramId: u.telegramId, role: u.role })),
		});

		// 5. Есть ли админы (получатели уведомлений о заказах)
		const admins = users.filter((u) => u.role === 'ADMIN');
		steps.push({
			step: '5. Админы (получатели уведомлений)',
			status: admins.length > 0 ? 'OK' : 'FAIL',
			detail: admins.length > 0
				? admins.map((a) => ({ name: a.name, telegramId: a.telegramId }))
				: 'Нет пользователей с ролью ADMIN. Уведомления о заказах некому отправлять.',
		});

		// 6. Отправка тестового сообщения первому админу
		if (this.bot && admins.length > 0) {
			const admin = admins[0];
			try {
				const msg = await this.bot.sendMessage(
					admin.telegramId,
					`Диагностика Bar Bot\n\nЭто тестовое сообщение. Если вы его видите — уведомления работают.\n\nВремя: ${new Date().toISOString()}`,
				);
				steps.push({
					step: '6. Отправка тестового сообщения админу',
					status: 'OK',
					detail: { sentTo: admin.name, telegramId: admin.telegramId, messageId: msg.message_id },
				});
			} catch (error: any) {
				const code = error?.response?.body?.error_code ?? error?.response?.error_code;
				const desc = error?.response?.body?.description ?? error?.message ?? String(error);
				steps.push({
					step: '6. Отправка тестового сообщения админу',
					status: 'FAIL',
					detail: {
						sentTo: admin.name,
						telegramId: admin.telegramId,
						errorCode: code,
						errorDescription: desc,
						hint: code === 403
							? 'Пользователь должен написать боту /start в Telegram'
							: code === 400
								? 'Неверный telegramId или чат не найден'
								: 'Неизвестная ошибка',
					},
				});
			}
		} else {
			steps.push({
				step: '6. Отправка тестового сообщения',
				status: 'SKIP',
				detail: !this.bot ? 'Бот не инициализирован' : 'Нет админов для отправки',
			});
		}

		const allOk = steps.every((s) => s.status === 'OK' || s.status === 'SKIP');

		return {
			result: allOk ? 'ALL_OK' : 'HAS_ISSUES',
			summary: allOk
				? 'Все проверки пройдены. Если уведомления не приходят, проверьте логи при создании заказа.'
				: 'Обнаружены проблемы. Смотрите шаги со статусом FAIL.',
			steps,
		};
	}

	/**
	 * Отправка тестового уведомления (для проверки работы Telegram). Возвращает результат для API.
	 */
	async sendTestNotification(userId: string): Promise<{ ok: boolean; error?: string; code?: number; description?: string }> {
		if (!this.bot) {
			return { ok: false, error: 'BOT_TOKEN не настроен или бот не инициализирован. Проверьте backend/.env' };
		}
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { telegramId: true, name: true },
		});
		if (!user || !user.telegramId) {
			return {
				ok: false,
				error: 'У пользователя не указан telegramId. Укажите Telegram ID в профиле/настройках или войдите через Telegram.',
			};
		}
		try {
			await this.bot.sendMessage(
				user.telegramId,
				'Тестовое уведомление от Bar Bot.\n\nЕсли вы видите это сообщение, уведомления работают.',
			);
			this.logger.log(`Test notification sent to user ${userId} (telegramId: ${user.telegramId})`);
			return { ok: true };
		} catch (error: any) {
			const code = error?.response?.body?.error_code ?? error?.response?.error_code;
			const desc = error?.response?.body?.description ?? error?.response?.body ?? error?.message ?? String(error);
			this.logger.error(`Test notification failed: code=${code}, description=${desc}`);
			if (code === 403) {
				return {
					ok: false,
					error: 'Пользователь должен написать боту /start в Telegram. Бот не может первым писать в личку.',
					code,
					description: String(desc),
				};
			}
			return { ok: false, error: 'Ошибка Telegram API', code, description: String(desc) };
		}
	}

	/**
	 * Отправка уведомления пользователю через Telegram Bot
	 */
	async sendNotification(userId: string, notification: { title: string; body: string; data?: any }) {
		if (!this.bot) {
			this.logger.error(`Cannot send notification: Telegram Bot not initialized. User: ${userId}, Title: ${notification.title}`);
			return;
		}

		this.logger.log(`Sending Telegram notification to user ${userId}: ${notification.title}`);
		
		// Получаем пользователя с telegramId
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { telegramId: true, name: true },
		});

		if (!user || !user.telegramId) {
			this.logger.warn(`User ${userId} (${user?.name || 'unknown'}) does not have telegramId. Notification will not be sent.`);
			return;
		}

		try {
			// Отправляем как обычный текст (без Markdown), чтобы спецсимволы в названии бара и т.д. не вызывали 400
			const message = `${notification.title}\n\n${notification.body}`;

			await this.bot.sendMessage(user.telegramId, message);

			this.logger.log(`Telegram notification sent to user ${userId} (telegramId: ${user.telegramId})`);
		} catch (error: any) {
			const code = error?.response?.body?.error_code ?? error?.response?.error_code;
			const desc = error?.response?.body?.description ?? error?.response?.body ?? error?.message ?? error;
			this.logger.error(
				`Failed to send Telegram notification to user ${userId} (telegramId: ${user.telegramId}): code=${code}, description=${JSON.stringify(desc)}`,
			);
			// 403 = бот заблокирован или пользователь не начинал диалог с ботом (/start)
			// 400 = неверный запрос (чат не найден, неверный формат и т.д.)
			if (code === 403) {
				this.logger.warn(
					`Пользователь ${user.telegramId} должен написать боту /start в Telegram, иначе бот не может отправить сообщение`,
				);
			}
			if (code === 400) {
				this.logger.warn(`Telegram вернул 400 для telegramId=${user.telegramId}. Проверьте, что чат с ботом существует.`);
			}
		}
	}

	/**
	 * Отправка уведомления о создании заказа
	 */
	async notifyOrderCreated(order: { id: string; barId?: string; bar?: { id: string; name: string }; items: any[] }) {
		this.logger.log(`Starting order notification for order ${order.id}`);
		
		const barName = order.bar?.name || 'Неизвестный бар';
		const barId = order.barId || order.bar?.id;

		if (!barId) {
			this.logger.error(`Cannot send order notification: barId is missing. Order: ${JSON.stringify({ id: order.id, barId: order.barId, hasBar: !!order.bar })}`);
			return;
		}

		this.logger.log(`Order barId: ${barId}, barName: ${barName}`);

		// Формируем список товаров
		const itemsList = order.items
			.map((item) => `  - ${item.product?.name || 'Товар'}: ${item.quantity} шт.`)
			.join('\n');

		// Получаем всех админов
		const admins = await this.prisma.user.findMany({
			where: { role: RoleType.ADMIN },
		});

		this.logger.log(`Found ${admins.length} admins`);

		// Получаем менеджеров, связанных с этим баром
		const managers = await this.prisma.user.findMany({
			where: {
				role: RoleType.MANAGER,
				bars: {
					some: {
						barId: barId,
					},
				},
			},
		});

		this.logger.log(`Found ${managers.length} managers for bar ${barId}`);

		const recipients = [...admins, ...managers];

		if (recipients.length === 0) {
			this.logger.warn(`No recipients found for order notification. Order ID: ${order.id}, Bar ID: ${barId}`);
			return;
		}

		this.logger.log(`Sending notifications to ${recipients.length} recipients`);

		await Promise.all(
			recipients.map((user) =>
				this.sendNotification(user.id, {
					title: `Новый заказ — ${barName}`,
					body: `Заказ #${order.id.slice(0, 8)}\n\n${itemsList}`,
					data: {
						type: 'order_created',
						orderId: order.id,
					},
				}),
			),
		);

		this.logger.log(`Order notification process completed for order ${order.id}`);
	}

	/**
	 * Отправка уведомления о создании прихода
	 */
	async notifyArrivalCreated(arrival: { id: string; type: string; barId?: string; bar?: { id: string; name: string }; items: any[] }) {
		const barName = arrival.bar?.name || 'Неизвестный бар';
		const typeLabel = arrival.type === 'ARRIVAL' ? 'Приход' : 'Списание';
		const barId = arrival.barId || arrival.bar?.id;

		if (!barId) {
			this.logger.warn('Cannot send arrival notification: barId is missing');
			return;
		}

		// Формируем список товаров
		const itemsList = arrival.items
			.map((item) => `  - ${item.product?.name || 'Товар'}: ${item.quantity} шт.`)
			.join('\n');

		// Получаем всех админов
		const admins = await this.prisma.user.findMany({
			where: { role: RoleType.ADMIN },
		});

		// Получаем менеджеров, связанных с этим баром
		const managers = await this.prisma.user.findMany({
			where: {
				role: RoleType.MANAGER,
				bars: {
					some: {
						barId: barId,
					},
				},
			},
		});

		const recipients = [...admins, ...managers];

		await Promise.all(
			recipients.map((user) =>
				this.sendNotification(user.id, {
					title: `${typeLabel} — ${barName}`,
					body: `${typeLabel} #${arrival.id.slice(0, 8)}\n\n${itemsList}`,
					data: {
						type: 'arrival_created',
						arrivalId: arrival.id,
						arrivalType: arrival.type,
					},
				}),
			),
		);
	}

	/**
	 * Отправка уведомления о выручке в конце дня
	 */
	async notifyDailyRevenue(revenues: Array<{ bar: { id: string; name: string }; cash: number; card: number }>) {
		// Получаем всех админов
		const admins = await this.prisma.user.findMany({
			where: { role: RoleType.ADMIN },
		});

		// Формируем сообщение для админов (все бары)
		const totalCash = revenues.reduce((sum, r) => sum + r.cash, 0);
		const totalCard = revenues.reduce((sum, r) => sum + r.card, 0);
		const total = totalCash + totalCard;

		const revenueDetails = revenues
			.map((r) => `${r.bar.name}: ${(r.cash + r.card).toFixed(2)} руб.`)
			.join('\n');

		await Promise.all(
			admins.map((admin) =>
				this.sendNotification(admin.id, {
					title: 'Выручка за день',
					body: `Общая выручка: ${total.toFixed(2)} руб.\n${revenueDetails}`,
					data: {
						type: 'daily_revenue',
					},
				}),
			),
		);

		// Получаем всех менеджеров и отправляем им выручку только по их барам
		const managers = await this.prisma.user.findMany({
			where: { role: RoleType.MANAGER },
			include: {
				bars: {
					include: {
						bar: true,
					},
				},
			},
		});

		await Promise.all(
			managers.map(async (manager) => {
				const managerBarIds = manager.bars.map((ub) => ub.barId);
				const managerRevenues = revenues.filter((r) => managerBarIds.includes(r.bar.id));

				if (managerRevenues.length === 0) return;

				const managerTotal = managerRevenues.reduce((sum, r) => sum + r.cash + r.card, 0);
				const managerDetails = managerRevenues
					.map((r) => `${r.bar.name}: ${(r.cash + r.card).toFixed(2)} руб.`)
					.join('\n');

				await this.sendNotification(manager.id, {
					title: 'Выручка за день',
					body: `Общая выручка: ${managerTotal.toFixed(2)} руб.\n${managerDetails}`,
					data: {
						type: 'daily_revenue',
					},
				});
			}),
		);
	}

	/**
	 * Отправка уведомления работнику (с поддержкой узбекского языка)
	 */
	async notifyWorker(workerId: string, titleRu: string, bodyRu: string, titleUz: string, bodyUz: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: workerId },
			include: { pushTokens: true },
		});

		if (!user || user.role !== RoleType.WORKER) {
			this.logger.warn(`User ${workerId} is not a worker`);
			return;
		}

		// Отправляем уведомление на русском и узбекском
		await this.sendNotification(workerId, {
			title: `${titleRu}\n${titleUz}`,
			body: `${bodyRu}\n\n${bodyUz}`,
			data: {
				type: 'worker_notification',
			},
		});
	}

	/**
	 * Отправка ежедневных уведомлений всем работникам
	 */
	async sendDailyWorkerNotifications() {
		const workers = await this.prisma.user.findMany({
			where: { role: RoleType.WORKER },
		});

		// Уведомление в 15:00 - заказ еды и закуп
		const title15Ru = 'Напоминание';
		const body15Ru = 'Не забудьте сделать заказ еды и закуп';
		const title15Uz = 'Eslatma';
		const body15Uz = 'Ovqat buyurtmasi va xaridni unutmang';

		await Promise.all(
			workers.map((worker) =>
				this.notifyWorker(worker.id, title15Ru, body15Ru, title15Uz, body15Uz),
			),
		);
	}

	/**
	 * Отправка уведомления о кассе в 22:50
	 */
	async sendDailyCashNotification() {
		const workers = await this.prisma.user.findMany({
			where: { role: RoleType.WORKER },
		});

		const titleRu = 'Напоминание';
		const bodyRu = 'Напишите сегодняшнюю кассу';
		const titleUz = 'Eslatma';
		const bodyUz = 'Bugungi kassani yozing';

		await Promise.all(
			workers.map((worker) => this.notifyWorker(worker.id, titleRu, bodyRu, titleUz, bodyUz)),
		);
	}
}
