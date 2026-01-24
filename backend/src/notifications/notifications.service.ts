import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import TelegramBot from 'node-telegram-bot-api';
import { RoleType } from '@prisma/client';

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name);
	private bot: TelegramBot | null = null;

	constructor(
		private prisma: PrismaService,
		private configService: ConfigService,
	) {
		// Инициализация Telegram Bot
		const botToken = this.configService.get<string>('BOT_TOKEN');
		
		if (botToken) {
			try {
				this.bot = new TelegramBot(botToken, { polling: false });
				this.logger.log('Telegram Bot initialized successfully');
			} catch (error) {
				this.logger.error('Failed to initialize Telegram Bot:', error);
				this.logger.warn('Telegram notifications will not work until BOT_TOKEN is properly configured.');
				this.bot = null;
			}
		} else {
			this.logger.warn('BOT_TOKEN not configured. Telegram notifications will not work.');
			this.logger.warn('Please set BOT_TOKEN in your .env file');
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
			// Формируем сообщение
			const message = `*${notification.title}*\n\n${notification.body}`;
			
			// Отправляем сообщение через Telegram Bot
			await this.bot.sendMessage(user.telegramId, message, {
				parse_mode: 'Markdown',
			});
			
			this.logger.log(`Telegram notification sent to user ${userId} (telegramId: ${user.telegramId})`);
		} catch (error: any) {
			this.logger.error(`Failed to send Telegram notification to user ${userId} (telegramId: ${user.telegramId}): ${error?.message || error}`);
			
			// Если пользователь заблокировал бота или чат не найден
			if (error?.response?.error_code === 403 || error?.response?.error_code === 400) {
				this.logger.warn(`User ${userId} (telegramId: ${user.telegramId}) may have blocked the bot or chat not found`);
			}
		}
	}

	/**
	 * Отправка уведомления о создании заказа
	 */
	async notifyOrderCreated(order: { id: string; barId?: string; bar?: { id: string; name: string }; items: any[] }) {
		this.logger.log(`Starting order notification for order ${order.id}`);
		
		const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
		const barName = order.bar?.name || 'Неизвестный бар';
		const barId = order.barId || order.bar?.id;

		if (!barId) {
			this.logger.error(`Cannot send order notification: barId is missing. Order: ${JSON.stringify({ id: order.id, barId: order.barId, hasBar: !!order.bar })}`);
			return;
		}

		this.logger.log(`Order barId: ${barId}, barName: ${barName}`);

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
					title: 'Новый заказ',
					body: `Заказ #${order.id.slice(0, 8)} из бара "${barName}". Товаров: ${totalItems} шт.`,
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
		const totalItems = arrival.items.reduce((sum, item) => sum + item.quantity, 0);
		const barName = arrival.bar?.name || 'Неизвестный бар';
		const typeLabel = arrival.type === 'ARRIVAL' ? 'Приход' : 'Списание';
		const barId = arrival.barId || arrival.bar?.id;

		if (!barId) {
			this.logger.warn('Cannot send arrival notification: barId is missing');
			return;
		}

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
					title: typeLabel,
					body: `${typeLabel} #${arrival.id.slice(0, 8)} из бара "${barName}". Товаров: ${totalItems} шт.`,
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
