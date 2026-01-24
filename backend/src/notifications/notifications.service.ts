import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';
import { RoleType } from '@prisma/client';

@Injectable()
export class NotificationsService {
	private readonly logger = new Logger(NotificationsService.name);
	private vapidInitialized = false;

	constructor(private prisma: PrismaService) {
		// Инициализация web-push с VAPID ключами из переменных окружения
		const publicKey = process.env.VAPID_PUBLIC_KEY;
		const privateKey = process.env.VAPID_PRIVATE_KEY;
		const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

		if (publicKey && privateKey) {
			try {
				webpush.setVapidDetails(subject, publicKey, privateKey);
				this.vapidInitialized = true;
				this.logger.log('Web Push initialized with VAPID keys');
			} catch (error) {
				this.logger.error('Failed to initialize VAPID keys:', error);
				this.logger.warn('Push notifications will not work until VAPID keys are properly configured.');
				this.vapidInitialized = false;
			}
		} else {
			this.logger.warn('VAPID keys not configured. Push notifications will not work.');
			this.logger.warn('Please set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and optionally VAPID_SUBJECT in your .env file');
			this.vapidInitialized = false;
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
	 * Отправка уведомления пользователю
	 */
	async sendNotification(userId: string, notification: { title: string; body: string; data?: any }) {
		if (!this.vapidInitialized) {
			this.logger.error(`Cannot send notification: VAPID keys not initialized. User: ${userId}, Title: ${notification.title}`);
			return;
		}

		this.logger.log(`Sending notification to user ${userId}: ${notification.title}`);
		
		const tokens = await this.prisma.pushToken.findMany({
			where: { userId },
		});

		if (tokens.length === 0) {
			this.logger.warn(`No push tokens found for user ${userId}. Notification will not be sent.`);
			return;
		}

		this.logger.log(`Found ${tokens.length} push token(s) for user ${userId}`);

		const payload = JSON.stringify({
			title: notification.title,
			body: notification.body,
			data: notification.data || {},
		});

		const results = await Promise.allSettled(
			tokens.map(async (tokenRecord) => {
				try {
					// Валидируем и парсим токен
					if (!tokenRecord.token || typeof tokenRecord.token !== 'string') {
						this.logger.warn(`Invalid token format for user ${userId}, token ID: ${tokenRecord.id}`);
						await this.prisma.pushToken.delete({
							where: { id: tokenRecord.id },
						});
						return;
					}

					let subscription;
					try {
						subscription = JSON.parse(tokenRecord.token);
					} catch (parseError) {
						this.logger.warn(`Failed to parse token for user ${userId}, token ID: ${tokenRecord.id}`);
						await this.prisma.pushToken.delete({
							where: { id: tokenRecord.id },
						});
						return;
					}

					// Валидируем структуру subscription
					if (!subscription.endpoint || !subscription.keys) {
						this.logger.warn(`Invalid subscription structure for user ${userId}, token ID: ${tokenRecord.id}`);
						await this.prisma.pushToken.delete({
							where: { id: tokenRecord.id },
						});
						return;
					}

					await webpush.sendNotification(subscription, payload);
					this.logger.debug(`Notification sent to user ${userId}, token ID: ${tokenRecord.id}`);
				} catch (error: any) {
					this.logger.error(`Failed to send notification to user ${userId}, token ID: ${tokenRecord.id}: ${error?.message || error}`);
					
					// Если токен невалидный или истек, удаляем его
					const statusCode = error?.statusCode || error?.response?.statusCode;
					if (statusCode === 410 || statusCode === 404 || statusCode === 400) {
						await this.prisma.pushToken.delete({
							where: { id: tokenRecord.id },
						}).catch((deleteError) => {
							this.logger.error(`Failed to delete invalid token ${tokenRecord.id}:`, deleteError);
						});
						this.logger.log(`Removed invalid token for user ${userId}, token ID: ${tokenRecord.id}`);
					}
					// Не пробрасываем ошибку дальше, чтобы не прерывать отправку другим токенам
				}
			}),
		);

		const successful = results.filter((r) => r.status === 'fulfilled').length;
		this.logger.log(`Sent ${successful}/${tokens.length} notifications to user ${userId}`);
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
