import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
	constructor(private prisma: PrismaService) {}

	async create(createPurchaseDto: CreatePurchaseDto) {
		const { barId, items } = createPurchaseDto;

		// Создаем Purchase и связанные PurchaseItem в транзакции
		return this.prisma.$transaction(async (tx) => {
			// Получаем все продукты по productId
			const productIds = items.map((item) => item.productId);
			const products = await tx.product.findMany({
				where: {
					id: { in: productIds },
					barId, // Проверяем, что продукт принадлежит бару
				},
			});

			// Проверяем, что все продукты найдены
			if (products.length !== productIds.length) {
				const foundIds = products.map((p) => p.id);
				const missingIds = productIds.filter((id) => !foundIds.includes(id));
				throw new NotFoundException(
					`Products not found: ${missingIds.join(', ')}`,
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

				const itemPriceAmount = product.price * item.quantity;
				const itemCostAmount = product.costPrice * item.quantity;

				totalPriceAmount += itemPriceAmount;
				totalCostAmount += itemCostAmount;

				// Сохраняем snapshot данных продукта в JSON формате в поле name
				// Используем amount для хранения quantity
				return {
					name: JSON.stringify({
						productName: product.name,
						productType: product.type,
						price: product.price,
						costPrice: product.costPrice,
						quantity: item.quantity,
					}),
					amount: item.quantity,
				};
			});

			// Используем totalCostAmount для totalAmount (закупка использует себестоимость)
			// totalPriceAmount также рассчитывается для возможного использования в будущем
			const totalAmount = totalCostAmount;

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

	async findAll(barId?: string) {
		const where = barId ? { barId } : {};

		return this.prisma.purchase.findMany({
			where,
			include: {
				items: true,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});
	}
}
