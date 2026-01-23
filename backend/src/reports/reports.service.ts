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

export interface CashAuditReport {
	barId: string;
	barName: string;
	startInventoryId: string;
	startInventoryDate: Date;
	startInventoryAmount: number;
	endInventoryId: string;
	endInventoryDate: Date;
	endInventoryAmount: number;
	period: {
		startDate: Date;
		endDate: Date;
	};
	incomes: {
		revenueCash: number;
		revenueCard: number;
		writeOffs: number; // Arrival с типом WRITE_OFF
		clientDebts: number; // Отрицательные балансы на конец периода
	};
	expenses: {
		purchasesAtSalePrice: number; // Закупки по цене продажи (BarProduct.price)
		clientDeposits: number; // Положительные балансы на конец периода
	};
	result: number; // Итог: должно быть ≈ 0
	status: 'ok' | 'surplus' | 'shortage'; // ok если ≈ 0, surplus если > 0, shortage если < 0
}

export interface ProfitReport {
	barId: string;
	barName: string;
	startInventoryId: string;
	startInventoryDate: Date;
	startInventoryAmount: number;
	endInventoryId: string;
	endInventoryDate: Date;
	endInventoryAmount: number;
	period: {
		startDate: Date;
		endDate: Date;
	};
	incomes: {
		revenueCash: number;
		revenueCard: number;
		clientDebts: number; // Отрицательные балансы на конец периода
	};
	expenses: {
		purchasesAtCostPrice: number; // Закупки по себестоимости (costPrice)
		expenses: number; // Expense за период
		clientDeposits: number; // Положительные балансы на конец периода
	};
	profit: number; // Итоговая прибыль
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

	/**
	 * Получить список инвентаризаций для бара
	 */
	async getInventories(barId: string): Promise<
		Array<{
			id: string;
			createdAt: Date;
			totalAmount: number;
			comment: string | null;
		}>
	> {
		const inventories = await this.prisma.inventory.findMany({
			where: { barId },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				createdAt: true,
				totalAmount: true,
				comment: true,
			},
		});

		return inventories;
	}

	/**
	 * Отчет 1: Проверка кассы (Cash Audit Report)
	 * Расчет между двумя инвентаризациями
	 */
	async getCashAuditReport(
		barId: string,
		startInventoryId: string,
		endInventoryId: string,
	): Promise<CashAuditReport> {
		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({ where: { id: barId } });
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		// Получаем инвентаризации
		const [startInventory, endInventory] = await Promise.all([
			this.prisma.inventory.findUnique({
				where: { id: startInventoryId },
			}),
			this.prisma.inventory.findUnique({
				where: { id: endInventoryId },
			}),
		]);

		if (!startInventory || !endInventory) {
			throw new NotFoundException('One or both inventories not found');
		}

		if (startInventory.barId !== barId || endInventory.barId !== barId) {
			throw new BadRequestException('Inventories do not belong to this bar');
		}

		if (startInventory.createdAt >= endInventory.createdAt) {
			throw new BadRequestException(
				'Start inventory must be earlier than end inventory',
			);
		}

		const startDate = startInventory.createdAt;
		const endDate = endInventory.createdAt;

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
		const revenueCash = revenues.reduce((sum, r) => sum + r.cash, 0);
		const revenueCard = revenues.reduce((sum, r) => sum + r.card, 0);

		// Списания (Arrival с типом WRITE_OFF)
		const writeOffs = await this.prisma.arrival.findMany({
			where: {
				barId,
				type: 'WRITE_OFF',
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			},
			include: {
				items: true,
			},
		});
		const writeOffsAmount = writeOffs.reduce((sum, arrival) => {
			return (
				sum +
				arrival.items.reduce(
					(itemSum, item) => itemSum + item.price * item.quantity,
					0,
				)
			);
		}, 0);

		// Долги и депозиты клиентов на конец периода
		const clients = await this.prisma.client.findMany({
			where: {
				barId,
				isActive: true,
			},
		});
		const clientDebts = clients
			.filter((c) => c.balance < 0)
			.reduce((sum, c) => sum + Math.abs(c.balance), 0);
		const clientDeposits = clients
			.filter((c) => c.balance > 0)
			.reduce((sum, c) => sum + c.balance, 0);

		// Закупки по цене продажи (BarProduct.price)
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

		// Получаем все BarProduct для маппинга цен
		const barProducts = await this.prisma.barProduct.findMany({
			where: { barId, isActive: true },
			include: {
				product: true,
			},
		});
		const productPriceMap = new Map(
			barProducts.map((bp) => [bp.productId, bp.price]),
		);

		let purchasesAtSalePrice = 0;
		for (const purchase of purchases) {
			for (const item of purchase.items) {
				try {
					const itemData = JSON.parse(item.name);
					const { productId, quantity } = itemData;
					const salePrice = productPriceMap.get(productId) || 0;
					purchasesAtSalePrice += salePrice * quantity;
				} catch (error) {
					// Если не удалось распарсить, используем текущую цену из BarProduct
					// Но для этого нужно знать productId, который может быть в itemData
					console.error('Error parsing purchase item:', error);
				}
			}
		}

		// Если в PurchaseItem нет productId в JSON, нужно найти его по имени
		// Но для упрощения, попробуем найти productId из itemData
		// Если не найдем, используем 0 (это нужно будет доработать)

		// Пересчитываем закупки, используя productId из JSON
		purchasesAtSalePrice = 0;
		for (const purchase of purchases) {
			for (const item of purchase.items) {
				try {
					const itemData = JSON.parse(item.name);
					const { productName, productType, quantity } = itemData;
					
					// Находим продукт по имени и типу
					const product = await this.prisma.product.findFirst({
						where: {
							name: productName,
							type: productType,
						},
					});

					if (product) {
						const salePrice = productPriceMap.get(product.id) || 0;
						purchasesAtSalePrice += salePrice * quantity;
					}
				} catch (error) {
					console.error('Error parsing purchase item:', error);
				}
			}
		}

		// Расчет итога
		const result =
			endInventory.totalAmount + // Текущая инвентаризация
			revenueCash +
			revenueCard +
			writeOffsAmount +
			clientDebts -
			purchasesAtSalePrice -
			startInventory.totalAmount - // Предыдущая инвентаризация
			clientDeposits;

		// Определяем статус (допускаем отклонение до 1% от выручки)
		const totalRevenue = revenueCash + revenueCard;
		const threshold = Math.abs(totalRevenue * 0.01);
		let status: 'ok' | 'surplus' | 'shortage';
		if (Math.abs(result) <= threshold) {
			status = 'ok';
		} else if (result > 0) {
			status = 'surplus';
		} else {
			status = 'shortage';
		}

		return {
			barId,
			barName: bar.name,
			startInventoryId: startInventory.id,
			startInventoryDate: startInventory.createdAt,
			startInventoryAmount: startInventory.totalAmount,
			endInventoryId: endInventory.id,
			endInventoryDate: endInventory.createdAt,
			endInventoryAmount: endInventory.totalAmount,
			period: {
				startDate,
				endDate,
			},
			incomes: {
				revenueCash,
				revenueCard,
				writeOffs: writeOffsAmount,
				clientDebts,
			},
			expenses: {
				purchasesAtSalePrice,
				clientDeposits,
			},
			result,
			status,
		};
	}

	/**
	 * Отчет 2: Расчет прибыли (Profit Report) - только для ADMIN
	 * Расчет между двумя инвентаризациями
	 */
	async getProfitReport(
		barId: string,
		startInventoryId: string,
		endInventoryId: string,
	): Promise<ProfitReport> {
		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({ where: { id: barId } });
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		// Получаем инвентаризации
		const [startInventory, endInventory] = await Promise.all([
			this.prisma.inventory.findUnique({
				where: { id: startInventoryId },
			}),
			this.prisma.inventory.findUnique({
				where: { id: endInventoryId },
			}),
		]);

		if (!startInventory || !endInventory) {
			throw new NotFoundException('One or both inventories not found');
		}

		if (startInventory.barId !== barId || endInventory.barId !== barId) {
			throw new BadRequestException('Inventories do not belong to this bar');
		}

		if (startInventory.createdAt >= endInventory.createdAt) {
			throw new BadRequestException(
				'Start inventory must be earlier than end inventory',
			);
		}

		const startDate = startInventory.createdAt;
		const endDate = endInventory.createdAt;

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
		const revenueCash = revenues.reduce((sum, r) => sum + r.cash, 0);
		const revenueCard = revenues.reduce((sum, r) => sum + r.card, 0);

		// Расходы (Expense)
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

		// Долги и депозиты клиентов на конец периода
		const clients = await this.prisma.client.findMany({
			where: {
				barId,
				isActive: true,
			},
		});
		const clientDebts = clients
			.filter((c) => c.balance < 0)
			.reduce((sum, c) => sum + Math.abs(c.balance), 0);
		const clientDeposits = clients
			.filter((c) => c.balance > 0)
			.reduce((sum, c) => sum + c.balance, 0);

		// Закупки по себестоимости (costPrice из JSON в PurchaseItem)
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

		let purchasesAtCostPrice = 0;
		for (const purchase of purchases) {
			for (const item of purchase.items) {
				try {
					const itemData = JSON.parse(item.name);
					const { costPrice, quantity } = itemData;
					purchasesAtCostPrice += costPrice * quantity;
				} catch (error) {
					console.error('Error parsing purchase item:', error);
				}
			}
		}

		// Расчет прибыли
		const profit =
			endInventory.totalAmount + // Текущая инвентаризация
			revenueCash +
			revenueCard +
			clientDebts -
			purchasesAtCostPrice -
			totalExpenses -
			startInventory.totalAmount - // Предыдущая инвентаризация
			clientDeposits;

		return {
			barId,
			barName: bar.name,
			startInventoryId: startInventory.id,
			startInventoryDate: startInventory.createdAt,
			startInventoryAmount: startInventory.totalAmount,
			endInventoryId: endInventory.id,
			endInventoryDate: endInventory.createdAt,
			endInventoryAmount: endInventory.totalAmount,
			period: {
				startDate,
				endDate,
			},
			incomes: {
				revenueCash,
				revenueCard,
				clientDebts,
			},
			expenses: {
				purchasesAtCostPrice,
				expenses: totalExpenses,
				clientDeposits,
			},
			profit,
		};
	}

	/**
	 * Сравнение прибыли между периодами для одного бара
	 */
	async compareProfitPeriods(
		barId: string,
		firstStartInventoryId: string,
		firstEndInventoryId: string,
		secondStartInventoryId: string,
		secondEndInventoryId: string,
	): Promise<{
		barId: string;
		barName: string;
		firstPeriod: ProfitReport;
		secondPeriod: ProfitReport;
		comparison: {
			profitDifference: number;
			profitChangePercent: number;
		};
	}> {
		const [firstReport, secondReport] = await Promise.all([
			this.getProfitReport(barId, firstStartInventoryId, firstEndInventoryId),
			this.getProfitReport(barId, secondStartInventoryId, secondEndInventoryId),
		]);

		const profitDifference = secondReport.profit - firstReport.profit;
		const profitChangePercent =
			firstReport.profit !== 0
				? (profitDifference / Math.abs(firstReport.profit)) * 100
				: 0;

		return {
			barId,
			barName: firstReport.barName,
			firstPeriod: firstReport,
			secondPeriod: secondReport,
			comparison: {
				profitDifference,
				profitChangePercent: Math.round(profitChangePercent * 100) / 100,
			},
		};
	}

	/**
	 * Сравнение прибыли между барами за один период
	 */
	async compareProfitBars(
		barIds: string[],
		startInventoryId: string,
		endInventoryId: string,
	): Promise<{
		period: {
			startDate: Date;
			endDate: Date;
		};
		bars: ProfitReport[];
		comparison: {
			bestBar: {
				barId: string;
				barName: string;
				profit: number;
			};
			worstBar: {
				barId: string;
				barName: string;
				profit: number;
			};
			averageProfit: number;
		};
	}> {
		if (barIds.length === 0) {
			throw new BadRequestException('At least one bar ID is required');
		}

		const reports = await Promise.all(
			barIds.map((barId) =>
				this.getProfitReport(barId, startInventoryId, endInventoryId),
			),
		);

		const sortedReports = [...reports].sort(
			(a, b) => b.profit - a.profit,
		);
		const bestBar = {
			barId: sortedReports[0].barId,
			barName: sortedReports[0].barName,
			profit: sortedReports[0].profit,
		};
		const worstBar = {
			barId: sortedReports[sortedReports.length - 1].barId,
			barName: sortedReports[sortedReports.length - 1].barName,
			profit: sortedReports[sortedReports.length - 1].profit,
		};
		const averageProfit =
			reports.reduce((sum, r) => sum + r.profit, 0) / reports.length;

		return {
			period: reports[0].period,
			bars: reports,
			comparison: {
				bestBar,
				worstBar,
				averageProfit: Math.round(averageProfit * 100) / 100,
			},
		};
	}
}
