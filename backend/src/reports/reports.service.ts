import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportPeriodDto, CompareBarsDto } from './dto/report-period.dto';
import { ProductType } from '@prisma/client';

export interface BarReport {
	revenue: number;
	expenses: number;
	purchases: number;
	profit: number;
	margin: number; // маржинальность в процентах
}

export interface TopProduct {
	productId: string;
	productName: string;
	productType: ProductType;
	totalQuantity: number;
	totalProfit: number;
	profitPerUnit: number;
}

export interface ProductTypeStats {
	type: ProductType;
	totalQuantity: number;
	totalProfit: number;
}

@Injectable()
export class ReportsService {
	constructor(private prisma: PrismaService) {}

	async getBarReport(barId: string, startDate: Date, endDate: Date): Promise<BarReport> {
		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({ where: { id: barId } });
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		// Выручка за период
		const revenues = await this.prisma.revenue.findMany({
			where: {
				barId,
				date: {
					gte: startDate,
					lte: endDate,
				},
			},
		});
		const revenue = revenues.reduce(
			(sum, r) => sum + r.cash + r.card,
			0,
		);

		// Расходы за период
		const expenses = await this.prisma.expense.findMany({
			where: {
				barId,
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
		});
		const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

		// Закупки за период
		const purchases = await this.prisma.purchase.findMany({
			where: {
				barId,
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
		});
		const totalPurchases = purchases.reduce(
			(sum, p) => sum + p.totalAmount,
			0,
		);

		// Прибыль и маржинальность
		const profit = revenue - totalExpenses - totalPurchases;
		const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

		return {
			revenue,
			expenses: totalExpenses,
			purchases: totalPurchases,
			profit,
			margin: Math.round(margin * 100) / 100, // округление до 2 знаков
		};
	}

	async getDailyReport(barId: string, date: string): Promise<BarReport> {
		const startDate = new Date(date);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(date);
		endDate.setHours(23, 59, 59, 999);

		return this.getBarReport(barId, startDate, endDate);
	}

	async getMonthlyReport(barId: string, month: string): Promise<BarReport> {
		// month в формате "2024-01"
		const [year, monthNum] = month.split('-').map(Number);
		const startDate = new Date(year, monthNum - 1, 1);
		const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

		return this.getBarReport(barId, startDate, endDate);
	}

	async getPeriodReport(
		barId: string,
		startDate: string,
		endDate: string,
	): Promise<BarReport> {
		return this.getBarReport(
			barId,
			new Date(startDate),
			new Date(endDate),
		);
	}

	async getTopProducts(
		barId: string,
		startDate: Date,
		endDate: Date,
		limit: number = 10,
	): Promise<TopProduct[]> {
		// Получаем все закупки за период
		const purchases = await this.prisma.purchase.findMany({
			where: {
				barId,
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
			include: {
				items: true,
			},
		});

		// Получаем все продукты, которые есть в баре, для маппинга по имени
		const barProducts = await this.prisma.barProduct.findMany({
			where: { barId, isActive: true },
			include: {
				product: {
					select: { id: true, name: true, type: true },
				},
			},
		});
		const products = barProducts.map((bp) => bp.product);

		// Создаем маппинг имя+тип -> productId
		const productNameMap = new Map<string, string>();
		for (const product of products) {
			const key = `${product.name}_${product.type}`;
			productNameMap.set(key, product.id);
		}

		// Собираем данные по продуктам
		const productMap = new Map<string, {
			productId: string;
			productName: string;
			productType: ProductType;
			totalQuantity: number;
			totalProfit: number;
			profitPerUnit: number;
		}>();

		for (const purchase of purchases) {
			for (const item of purchase.items) {
				try {
					const itemData = JSON.parse(item.name);
					const { productName, productType, price, costPrice, quantity } = itemData;
					
					// Прибыль с единицы
					const profitPerUnit = price - costPrice;
					// Общая прибыль от этого товара в этой закупке
					const totalProfit = profitPerUnit * quantity;

					// Пытаемся найти реальный productId по имени и типу
					const nameKey = `${productName}_${productType}`;
					const productId = productNameMap.get(nameKey) || nameKey;

					if (productMap.has(productId)) {
						const existing = productMap.get(productId)!;
						existing.totalQuantity += quantity;
						existing.totalProfit += totalProfit;
					} else {
						productMap.set(productId, {
							productId,
							productName,
							productType,
							totalQuantity: quantity,
							totalProfit,
							profitPerUnit,
						});
					}
				} catch (error) {
					// Пропускаем некорректные данные
					console.error('Error parsing purchase item:', error);
				}
			}
		}

		// Сортируем по прибыли и берем топ
		const topProducts = Array.from(productMap.values())
			.sort((a, b) => b.totalProfit - a.totalProfit)
			.slice(0, limit);

		return topProducts;
	}

	async getProductTypeStats(
		barId: string,
		startDate: Date,
		endDate: Date,
	): Promise<ProductTypeStats[]> {
		const purchases = await this.prisma.purchase.findMany({
			where: {
				barId,
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
			include: {
				items: true,
			},
		});

		const typeMap = new Map<ProductType, { totalQuantity: number; totalProfit: number }>();

		for (const purchase of purchases) {
			for (const item of purchase.items) {
				try {
					const itemData = JSON.parse(item.name);
					const { productType, price, costPrice, quantity } = itemData;
					
					const profitPerUnit = price - costPrice;
					const totalProfit = profitPerUnit * quantity;

					if (typeMap.has(productType)) {
						const existing = typeMap.get(productType)!;
						existing.totalQuantity += quantity;
						existing.totalProfit += totalProfit;
					} else {
						typeMap.set(productType, {
							totalQuantity: quantity,
							totalProfit,
						});
					}
				} catch (error) {
					console.error('Error parsing purchase item:', error);
				}
			}
		}

		return Array.from(typeMap.entries()).map(([type, stats]) => ({
			type,
			...stats,
		}));
	}

	async compareBars(compareDto: CompareBarsDto): Promise<any> {
		const { barIds, startDate, endDate } = compareDto;

		if (barIds.length === 0) {
			throw new BadRequestException('At least one bar ID is required');
		}

		const start = new Date(startDate);
		const end = new Date(endDate);

		const reports = await Promise.all(
			barIds.map(async (barId) => {
				const report = await this.getBarReport(barId, start, end);
				const bar = await this.prisma.bar.findUnique({
					where: { id: barId },
				});
				return {
					barId,
					barName: bar?.name || 'Unknown',
					...report,
				};
			}),
		);

		return {
			period: {
				startDate,
				endDate,
			},
			bars: reports,
		};
	}
}
