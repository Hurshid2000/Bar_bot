import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseFilterDto } from '../common/dto/filter.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';

@Injectable()
export class PurchasesService {
	constructor(private prisma: PrismaService) {}

	async create(createPurchaseDto: CreatePurchaseDto) {
		const { barId, items } = createPurchaseDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		// Создаем Purchase и связанные PurchaseItem в транзакции
		return this.prisma.$transaction(async (tx) => {
			// Получаем все продукты по productId
			const productIds = items.map((item) => item.productId);
			const products = await tx.product.findMany({
				where: {
					id: { in: productIds },
				},
				include: {
					barProducts: {
						where: { barId, isActive: true },
					},
				},
			});

			// Проверяем, что все продукты найдены
			if (products.length !== productIds.length) {
				const foundIds = products.map((p) => p.id);
				const missingIds = productIds.filter((id) => !foundIds.includes(id));
				throw new NotFoundException(
					`Products with IDs [${missingIds.join(', ')}] not found`,
				);
			}

			// Создаем маппинг productId -> Product для быстрого доступа
			const productMap = new Map(products.map((p) => [p.id, p]));

			// Рассчитываем суммы на backend
			let totalPriceAmount = 0;
			let totalCostAmount = 0;

			// Подготавливаем данные для PurchaseItem с snapshot данных продукта
			const purchaseItemsData = items.map((item) => {
				const product = productMap.get(item.productId);
				if (!product) {
					throw new NotFoundException(`Product ${item.productId} not found`);
				}

				// Продажная цена: из BarProduct, иначе defaultPrice, иначе 0
				const barProduct = product.barProducts?.[0];
				const price = barProduct?.price ?? product.defaultPrice ?? 0;

				const itemPriceAmount = price * item.quantity;
				const itemCostAmount = (product.costPrice ?? 0) * item.quantity;

				totalPriceAmount += itemPriceAmount;
				totalCostAmount += itemCostAmount;

				// Сохраняем snapshot данных продукта в JSON формате в поле name
				// Используем amount для хранения quantity
				return {
					name: JSON.stringify({
						productName: product.name,
						productType: product.type,
						price: price,
						costPrice: product.costPrice ?? 0,
						quantity: item.quantity,
					}),
					amount: item.quantity,
				};
			});

			// Сумма закупа = полная стоимость по ПРОДАЖНОЙ цене (кол-во × цена продажи).
			// totalCostAmount (себестоимость) сохраняем для возможной аналитики.
			void totalCostAmount;
			const totalAmount = totalPriceAmount;

			// Создаем Purchase
			const purchase = await tx.purchase.create({
				data: {
					bar: {
						connect: { id: barId },
					},
					totalAmount,
					items: {
						create: purchaseItemsData,
					},
				},
				include: {
					items: true,
				},
			});

			return purchase;
		});
	}

	async findAll(
		filter: PurchaseFilterDto,
		pagination: PaginationDto,
	): Promise<PaginatedResponse<any>> {
		const { barId, startDate, endDate } = filter;
		const { page = 1, limit = 20 } = pagination;

		const where: any = {};
		if (barId) where.barId = barId;
		if (startDate || endDate) {
			where.createdAt = {};
			if (startDate) where.createdAt.gte = new Date(startDate);
			if (endDate) where.createdAt.lte = new Date(endDate);
		}

		const [purchases, total] = await Promise.all([
			this.prisma.purchase.findMany({
				where,
				include: {
					items: true,
					supplier: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.purchase.count({ where }),
		]);

		return createPaginatedResponse(purchases, total, page, limit);
	}
}
