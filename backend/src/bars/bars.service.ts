import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarDto } from './dto/create-bar.dto';
import { UpdateBarDto } from './dto/update-bar.dto';

export interface BarMonthlyStats {
	barId: string;
	barName: string;
	totalCash: number;
	totalCard: number;
	totalRevenue: number;
	totalExpenses: number;
}

@Injectable()
export class BarsService {
	constructor(private prisma: PrismaService) {}

	async create(createBarDto: CreateBarDto) {
		// Создаем бар
		const bar = await this.prisma.bar.create({
			data: {
				name: createBarDto.name,
				isActive: createBarDto.isActive ?? true,
			},
		});

		// Получаем все продукты с defaultPrice и создаем для них BarProduct
		const productsWithDefaultPrice = await this.prisma.product.findMany({
			where: {
				defaultPrice: { not: null },
			},
		});

		if (productsWithDefaultPrice.length > 0) {
			await this.prisma.barProduct.createMany({
				data: productsWithDefaultPrice.map((product) => ({
					barId: bar.id,
					productId: product.id,
					price: product.defaultPrice!,
					isActive: true,
				})),
				skipDuplicates: true,
			});
		}

		return bar;
	}

	async findAll() {
		return this.prisma.bar.findMany({
			orderBy: {
				createdAt: 'desc',
			},
		});
	}

	async findOne(id: string) {
		const bar = await this.prisma.bar.findUnique({
			where: { id },
		});

		if (!bar) {
			throw new NotFoundException(`Bar with ID ${id} not found`);
		}

		return bar;
	}

	async update(id: string, updateBarDto: UpdateBarDto) {
		// Проверяем существование бара
		await this.findOne(id);

		return this.prisma.bar.update({
			where: { id },
			data: updateBarDto,
		});
	}

	async remove(id: string) {
		// Проверяем существование бара
		await this.findOne(id);

		return this.prisma.bar.delete({
			where: { id },
		});
	}

	/**
	 * Получить месячную статистику для всех баров.
	 * Агрегирует revenue (cash/card) и expenses за указанный период.
	 */
	async getMonthlyStats(startDate: string, endDate: string): Promise<BarMonthlyStats[]> {
		const start = new Date(startDate + 'T00:00:00.000Z');
		const endNext = new Date(endDate + 'T00:00:00.000Z');
		endNext.setUTCDate(endNext.getUTCDate() + 1);

		// Получаем все бары
		const bars = await this.prisma.bar.findMany({
			orderBy: { createdAt: 'desc' },
		});

		// Агрегируем revenue по барам
		const revenueAgg = await this.prisma.revenue.groupBy({
			by: ['barId'],
			where: {
				date: { gte: start, lt: endNext },
			},
			_sum: {
				cash: true,
				card: true,
			},
		});

		// Агрегируем expenses по барам (по полю date)
		const expenseAgg = await this.prisma.expense.groupBy({
			by: ['barId'],
			where: {
				date: { gte: start, lt: endNext },
			},
			_sum: {
				amount: true,
			},
		});

		// Собираем результат
		const revenueMap = new Map(
			revenueAgg.map((r) => [r.barId, { cash: r._sum.cash || 0, card: r._sum.card || 0 }]),
		);
		const expenseMap = new Map(
			expenseAgg.map((e) => [e.barId, e._sum.amount || 0]),
		);

		return bars.map((bar) => {
			const rev = revenueMap.get(bar.id) || { cash: 0, card: 0 };
			const exp = expenseMap.get(bar.id) || 0;
			return {
				barId: bar.id,
				barName: bar.name,
				totalCash: rev.cash,
				totalCard: rev.card,
				totalRevenue: rev.cash + rev.card,
				totalExpenses: exp,
			};
		});
	}
}
