import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleFilterDto } from './dto/sale-filter.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';

const SALE_INCLUDE = {
	product: { include: { category: true } },
	bar: true,
	user: { select: { id: true, name: true, role: true } },
};

@Injectable()
export class SalesService {
	constructor(
		private prisma: PrismaService,
		private stockService: StockService,
	) {}

	/**
	 * Создать продажу — в транзакции: проверка остатка, списание со склада, запись продажи
	 */
	async create(userId: string, dto: CreateSaleDto) {
		const { barId, productId, quantity, price, buyerName } = dto;

		// Проверяем продукт
		const product = await this.prisma.product.findUnique({
			where: { id: productId },
		});
		if (!product) {
			throw new NotFoundException('Продукт не найден');
		}

		const total = quantity * price;

		// Транзакция: проверяем остаток и списываем
		return this.prisma.$transaction(async (tx) => {
			// Проверяем и списываем остаток атомарно
			const result = await tx.stock.updateMany({
				where: {
					barId,
					productId,
					quantity: { gte: quantity },
				},
				data: {
					quantity: { decrement: quantity },
				},
			});

			if (result.count === 0) {
				// Получаем текущий остаток для сообщения об ошибке
				const currentStock = await tx.stock.findUnique({
					where: { barId_productId: { barId, productId } },
				});
				const available = currentStock?.quantity ?? 0;
				throw new BadRequestException(
					`Недостаточно товара на складе. Доступно: ${available}, запрошено: ${quantity}`,
				);
			}

			// Создаём продажу
			return tx.sale.create({
				data: {
					barId,
					productId,
					userId,
					quantity,
					price,
					total,
					buyerName: buyerName || null,
				},
				include: SALE_INCLUDE,
			});
		});
	}

	/**
	 * Список продаж с фильтрацией
	 */
	async findAll(filter: SaleFilterDto) {
		const { barId, date, startDate, endDate, page = 1, limit = 50 } = filter;

		const where: any = {};
		if (barId) where.barId = barId;

		if (date) {
			const dateObj = new Date(date + 'T00:00:00.000Z');
			const nextDay = new Date(dateObj);
			nextDay.setUTCDate(nextDay.getUTCDate() + 1);
			where.date = { gte: dateObj, lt: nextDay };
		} else if (startDate || endDate) {
			where.date = {};
			if (startDate) {
				where.date.gte = new Date(startDate + 'T00:00:00.000Z');
			}
			if (endDate) {
				const endDateObj = new Date(endDate + 'T00:00:00.000Z');
				const nextDay = new Date(endDateObj);
				nextDay.setUTCDate(nextDay.getUTCDate() + 1);
				where.date.lt = nextDay;
			}
		}

		const [data, total] = await Promise.all([
			this.prisma.sale.findMany({
				where,
				include: SALE_INCLUDE,
				orderBy: { createdAt: 'desc' },
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.sale.count({ where }),
		]);

		return createPaginatedResponse(data, total, page, limit);
	}

	/**
	 * Агрегация продаж по бару за период (для отображения в выручке)
	 */
	async getSalesSummary(barId: string, startDate: string, endDate: string) {
		const start = new Date(startDate + 'T00:00:00.000Z');
		const endObj = new Date(endDate + 'T00:00:00.000Z');
		const nextDay = new Date(endObj);
		nextDay.setUTCDate(nextDay.getUTCDate() + 1);

		const result = await this.prisma.sale.aggregate({
			where: {
				barId,
				date: { gte: start, lt: nextDay },
			},
			_sum: { total: true },
			_count: { id: true },
		});

		return {
			totalAmount: result._sum.total || 0,
			count: result._count.id || 0,
		};
	}

	/**
	 * Продажи сгруппированные по дням (для карточек дней в выручке)
	 */
	async getDailySales(barId: string, startDate: string, endDate: string) {
		const start = new Date(startDate + 'T00:00:00.000Z');
		const endObj = new Date(endDate + 'T00:00:00.000Z');
		const nextDay = new Date(endObj);
		nextDay.setUTCDate(nextDay.getUTCDate() + 1);

		const sales = await this.prisma.sale.findMany({
			where: {
				barId,
				date: { gte: start, lt: nextDay },
			},
			include: {
				product: { select: { name: true, type: true } },
				user: { select: { id: true, name: true } },
			},
			orderBy: { date: 'desc' },
		});

		return sales;
	}

	/**
	 * Отчет по спортпиту: выручка, себестоимость, прибыль по каждому продукту за период
	 */
	async getSportpitReport(
		barId: string,
		startDate: string,
		endDate: string,
	): Promise<{
		items: Array<{
			productId: string;
			productName: string;
			categoryName: string;
			quantity: number;
			revenue: number;
			cost: number;
			profit: number;
		}>;
		totalRevenue: number;
		totalCost: number;
		totalProfit: number;
	}> {
		const start = new Date(startDate + 'T00:00:00.000Z');
		const endObj = new Date(endDate + 'T00:00:00.000Z');
		const nextDay = new Date(endObj);
		nextDay.setUTCDate(nextDay.getUTCDate() + 1);

		const sales = await this.prisma.sale.findMany({
			where: {
				barId,
				date: { gte: start, lt: nextDay },
				product: { type: ProductType.SPORT_PIT },
			},
			include: {
				product: {
					select: {
						id: true,
						name: true,
						costPrice: true,
						category: { select: { name: true } },
					},
				},
			},
		});

		// Группировка по productId
		const map = new Map<
			string,
			{ quantity: number; revenue: number; cost: number; productName: string; categoryName: string }
		>();

		for (const s of sales) {
			const cost = (s.product.costPrice ?? 0) * s.quantity;
			const existing = map.get(s.productId);
			if (existing) {
				existing.quantity += s.quantity;
				existing.revenue += s.total;
				existing.cost += cost;
			} else {
				map.set(s.productId, {
					quantity: s.quantity,
					revenue: s.total,
					cost,
					productName: s.product.name,
					categoryName: s.product.category?.name ?? '',
				});
			}
		}

		const items = Array.from(map.entries()).map(
			([productId, data]) => ({
				productId,
				productName: data.productName,
				categoryName: data.categoryName,
				quantity: data.quantity,
				revenue: data.revenue,
				cost: data.cost,
				profit: data.revenue - data.cost,
			}),
		);

		const totalRevenue = items.reduce((a, i) => a + i.revenue, 0);
		const totalCost = items.reduce((a, i) => a + i.cost, 0);
		const totalProfit = totalRevenue - totalCost;

		return {
			items: items.sort((a, b) => b.revenue - a.revenue),
			totalRevenue,
			totalCost,
			totalProfit,
		};
	}
}
