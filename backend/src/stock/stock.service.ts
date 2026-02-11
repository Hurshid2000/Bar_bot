import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductType } from '@prisma/client';

@Injectable()
export class StockService {
	constructor(private prisma: PrismaService) {}

	/**
	 * Получить остатки по бару (с фильтрацией по типу продукта)
	 */
	async getByBar(barId: string, productType?: ProductType) {
		const where: any = { barId, quantity: { gt: 0 } };

		if (productType) {
			where.product = { type: productType };
		}

		return this.prisma.stock.findMany({
			where,
			include: {
				product: {
					include: { category: true },
				},
			},
			orderBy: { product: { name: 'asc' } },
		});
	}

	/**
	 * Получить остаток конкретного продукта в баре
	 */
	async getProductStock(barId: string, productId: string): Promise<number> {
		const stock = await this.prisma.stock.findUnique({
			where: { barId_productId: { barId, productId } },
		});
		return stock?.quantity ?? 0;
	}

	/**
	 * Получить остатки для нескольких продуктов (для карточек каталога)
	 */
	async getStockMap(barId: string, productIds: string[]): Promise<Record<string, number>> {
		const stocks = await this.prisma.stock.findMany({
			where: { barId, productId: { in: productIds } },
			select: { productId: true, quantity: true },
		});
		const map: Record<string, number> = {};
		for (const s of stocks) {
			map[s.productId] = s.quantity;
		}
		return map;
	}

	/**
	 * Увеличить остаток (при приходе)
	 */
	async increase(barId: string, productId: string, quantity: number) {
		return this.prisma.stock.upsert({
			where: { barId_productId: { barId, productId } },
			create: { barId, productId, quantity },
			update: { quantity: { increment: quantity } },
		});
	}

	/**
	 * Уменьшить остаток (при продаже или списании)
	 * Возвращает обновлённый stock или null если недостаточно
	 */
	async decrease(barId: string, productId: string, quantity: number) {
		// Атомарная проверка и обновление
		const result = await this.prisma.stock.updateMany({
			where: {
				barId,
				productId,
				quantity: { gte: quantity },
			},
			data: {
				quantity: { decrement: quantity },
			},
		});
		return result.count > 0;
	}
}
