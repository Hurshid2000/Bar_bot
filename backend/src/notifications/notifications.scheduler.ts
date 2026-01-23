import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsScheduler {
	private readonly logger = new Logger(NotificationsScheduler.name);

	constructor(
		private notificationsService: NotificationsService,
		private prisma: PrismaService,
	) {}

	/**
	 * Ежедневное уведомление работникам в 15:00
	 * "Не забудьте сделать заказ еды и закуп"
	 */
	@Cron('0 15 * * *', {
		name: 'daily-food-order-reminder',
		timeZone: 'Asia/Tashkent', // Узбекистан (UTC+5)
	})
	async handleDailyFoodOrderReminder() {
		try {
			this.logger.log('Sending daily food order reminder to workers');
			await this.notificationsService.sendDailyWorkerNotifications();
		} catch (error) {
			this.logger.error('Failed to send daily food order reminder:', error);
		}
	}

	/**
	 * Ежедневное уведомление работникам в 22:50
	 * "Напишите сегодняшнюю кассу"
	 */
	@Cron('50 22 * * *', {
		name: 'daily-cash-reminder',
		timeZone: 'Asia/Tashkent', // Узбекистан (UTC+5)
	})
	async handleDailyCashReminder() {
		try {
			this.logger.log('Sending daily cash reminder to workers');
			await this.notificationsService.sendDailyCashNotification();
		} catch (error) {
			this.logger.error('Failed to send daily cash reminder:', error);
		}
	}

	/**
	 * Ежедневная отправка выручки админам и менеджерам в 23:00
	 */
	@Cron('0 23 * * *', {
		name: 'daily-revenue-report',
		timeZone: 'Asia/Tashkent', // Узбекистан (UTC+5)
	})
	async handleDailyRevenueReport() {
		try {
			this.logger.log('Sending daily revenue report to admins and managers');

			// Получаем выручку за сегодня
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const revenues = await this.prisma.revenue.findMany({
				where: {
					date: {
						gte: today,
						lt: tomorrow,
					},
				},
				include: {
					bar: true,
				},
			});

			if (revenues.length > 0) {
				await this.notificationsService.notifyDailyRevenue(revenues);
			} else {
				this.logger.log('No revenue data for today');
			}
		} catch (error) {
			this.logger.error('Failed to send daily revenue report:', error);
		}
	}
}
