import {
	Injectable,
	Inject,
	forwardRef,
	NotFoundException,
	ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { RevenueFilterDto } from './dto/revenue-filter.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';
import { RoleType } from '@prisma/client';
import { parseCardTotalsFromExcel } from './card-excel.parser';

const REVENUE_INCLUDE = {
	bar: true,
	createdBy: {
		select: { id: true, name: true, role: true },
	},
	updatedBy: {
		select: { id: true, name: true, role: true },
	},
};

@Injectable()
export class RevenueService {
	constructor(
		private prisma: PrismaService,
		@Inject(forwardRef(() => NotificationsService))
		private notificationsService: NotificationsService,
	) {}

	/**
	 * Создаёт или обновляет запись выручки (upsert)
	 * - Если запись на эту дату не существует — создаёт новую
	 * - Если существует — обновляет переданные поля (cash/card)
	 * - Записывает автора создания / изменения
	 */
	async create(createRevenueDto: CreateRevenueDto, userId: string) {
		const { barId, date } = createRevenueDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		const dateObj = new Date(date);

		const hasCash = 'cash' in createRevenueDto && createRevenueDto.cash !== undefined && createRevenueDto.cash !== null;
		const hasCard = 'card' in createRevenueDto && createRevenueDto.card !== undefined && createRevenueDto.card !== null;

		// Формируем объект для update — только реально переданные поля
		const updateData: any = { updatedById: userId };
		if (hasCash) updateData.cash = createRevenueDto.cash;
		if (hasCard) updateData.card = createRevenueDto.card;

		const result = await this.prisma.revenue.upsert({
			where: {
				barId_date: {
					barId,
					date: dateObj,
				},
			},
			create: {
				barId,
				date: dateObj,
				cash: hasCash ? createRevenueDto.cash! : 0,
				card: hasCard ? createRevenueDto.card! : 0,
				createdById: userId,
			},
			update: updateData,
			include: REVENUE_INCLUDE,
		});

		// Мгновенное уведомление о изменении кассы
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { name: true },
		});
		this.notificationsService
			.notifyRevenueChanged(result, user?.name)
			.catch(() => {});

		return result;
	}

	/**
	 * Обновить запись выручки по ID.
	 * Может только автор записи или ADMIN.
	 */
	async update(id: string, updateRevenueDto: UpdateRevenueDto, userId: string, userRole: RoleType) {
		const revenue = await this.prisma.revenue.findUnique({
			where: { id },
		});

		if (!revenue) {
			throw new NotFoundException(`Revenue with ID ${id} not found`);
		}

		// Проверяем права: только автор или ADMIN
		if (userRole !== RoleType.ADMIN && revenue.createdById !== userId) {
			throw new ForbiddenException('Только автор записи или администратор может редактировать');
		}

		const data: any = { updatedById: userId };
		if (updateRevenueDto.cash !== undefined) data.cash = updateRevenueDto.cash;
		if (updateRevenueDto.card !== undefined) data.card = updateRevenueDto.card;

		const result = await this.prisma.revenue.update({
			where: { id },
			data,
			include: REVENUE_INCLUDE,
		});

		// Мгновенное уведомление о изменении кассы
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { name: true },
		});
		this.notificationsService
			.notifyRevenueChanged(result, user?.name)
			.catch(() => {});

		return result;
	}

	async findAll(
		filter: RevenueFilterDto,
	): Promise<PaginatedResponse<any>> {
		const { barId, date, startDate, endDate, page = 1, limit = 50 } = filter;

		const where: any = {};
		if (barId) where.barId = barId;

		if (date) {
			const dateObj = new Date(date + 'T00:00:00.000Z');
			const nextDay = new Date(dateObj);
			nextDay.setUTCDate(nextDay.getUTCDate() + 1);
			where.date = {
				gte: dateObj,
				lt: nextDay,
			};
		} else if (startDate || endDate) {
			where.date = {};
			if (startDate) {
				const startDateObj = new Date(startDate + 'T00:00:00.000Z');
				where.date.gte = startDateObj;
			}
			if (endDate) {
				const endDateObj = new Date(endDate + 'T00:00:00.000Z');
				const nextDay = new Date(endDateObj);
				nextDay.setUTCDate(nextDay.getUTCDate() + 1);
				where.date.lt = nextDay;
			}
		}

		const [revenues, total] = await Promise.all([
			this.prisma.revenue.findMany({
				where,
				orderBy: {
					date: 'desc',
				},
				include: REVENUE_INCLUDE,
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.revenue.count({ where }),
		]);

		return createPaginatedResponse(revenues, total, page, limit);
	}

	async findOne(id: string) {
		const revenue = await this.prisma.revenue.findUnique({
			where: { id },
			include: REVENUE_INCLUDE,
		});

		if (!revenue) {
			throw new NotFoundException(`Revenue with ID ${id} not found`);
		}

		return revenue;
	}

	/**
	 * Импорт поступлений на карту из Excel.
	 * Заполняет только те дни, где запись отсутствует или card === 0. Остальное не трогает.
	 * Ожидаемый формат в файле: строки вида "Итого за DD.MM.YYYY: Поступление: X XXX".
	 */
	async importCardFromExcel(
		fileBuffer: Buffer,
		barId: string,
		userId: string,
	): Promise<{ imported: number; skipped: number; parsed: number }> {
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		const rows = await parseCardTotalsFromExcel(fileBuffer);
		let imported = 0;
		let skipped = 0;

		for (const { date, amount } of rows) {
			const dateObj = new Date(date + 'T00:00:00.000Z');
			const existing = await this.prisma.revenue.findUnique({
				where: {
					barId_date: { barId, date: dateObj },
				},
			});

			// Пропускаем только если карта уже заполнена (число > 0)
			if (existing && (existing.card ?? 0) > 0.01) {
				skipped++;
				continue;
			}

			await this.prisma.revenue.upsert({
				where: {
					barId_date: { barId, date: dateObj },
				},
				create: {
					barId,
					date: dateObj,
					cash: 0,
					card: amount,
					createdById: userId,
					updatedById: userId,
				},
				update: {
					card: amount,
					updatedById: userId,
				},
			});
			imported++;
		}

		return { imported, skipped, parsed: rows.length };
	}
}
