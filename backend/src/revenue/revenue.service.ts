import {
	Injectable,
	BadRequestException,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { RevenueFilterDto } from './dto/revenue-filter.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';

@Injectable()
export class RevenueService {
	constructor(private prisma: PrismaService) {}

	/**
	 * Создаёт или обновляет запись выручки (upsert)
	 * - Если запись на эту дату не существует - создаёт новую
	 * - Если существует - обновляет переданные поля (cash/card)
	 * - Можно обновлять только cash или только card
	 */
	async create(createRevenueDto: CreateRevenueDto) {
		const { barId, date, cash, card } = createRevenueDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		const dateObj = new Date(date);

		// Используем upsert: создаём если нет, обновляем если есть
		return this.prisma.revenue.upsert({
			where: {
				barId_date: {
					barId,
					date: dateObj,
				},
			},
			// При создании новой записи
			create: {
				barId,
				date: dateObj,
				cash: cash ?? 0,
				card: card ?? 0,
			},
			// При обновлении существующей - обновляем только переданные поля
			update: {
				...(cash !== undefined && { cash }),
				...(card !== undefined && { card }),
			},
		});
	}

	async findAll(
		filter: RevenueFilterDto,
	): Promise<PaginatedResponse<any>> {
		const { barId, date, startDate, endDate, page = 1, limit = 20 } = filter;

		const where: any = {};
		if (barId) where.barId = barId;
		
		// Если передан date, используем его для точного дня (startOfDay <= date < nextDay)
		if (date) {
			// Создаем дату с началом дня в UTC
			const dateObj = new Date(date + 'T00:00:00.000Z');
			const nextDay = new Date(dateObj);
			nextDay.setUTCDate(nextDay.getUTCDate() + 1);
			where.date = {
				gte: dateObj,
				lt: nextDay, // Меньше следующего дня = точный день
			};
		} else if (startDate || endDate) {
			// Фильтрация по полю date в диапазоне (inclusive)
			where.date = {};
			if (startDate) {
				// startOfDay для startDate
				const startDateObj = new Date(startDate + 'T00:00:00.000Z');
				where.date.gte = startDateObj;
			}
			if (endDate) {
				// startOfDay(endDate + 1 day) для inclusive endDate
				const endDateObj = new Date(endDate + 'T00:00:00.000Z');
				const nextDay = new Date(endDateObj);
				nextDay.setUTCDate(nextDay.getUTCDate() + 1);
				where.date.lt = nextDay; // Меньше следующего дня = включительно до конца endDate
			}
		}

		const [revenues, total] = await Promise.all([
			this.prisma.revenue.findMany({
				where,
				orderBy: {
					date: 'desc',
				},
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.revenue.count({ where }),
		]);

		return createPaginatedResponse(revenues, total, page, limit);
	}
}
