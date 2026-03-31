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

	// Ежедневный отчёт в 23:00 удалён — теперь уведомления
	// отправляются мгновенно при изменении кассы (наличка/карта/расход).
}
