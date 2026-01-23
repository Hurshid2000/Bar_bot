import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';

@Injectable()
export class InventoriesService {
	constructor(private prisma: PrismaService) {}

	async create(userId: string, createInventoryDto: CreateInventoryDto) {
		const { barId, items, comment } = createInventoryDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		if (!items || items.length === 0) {
			throw new BadRequestException('Inventory must contain at least one item');
		}

		// Получаем информацию о продуктах и ценах
		const productIds = items.map((item) => item.productId);
		const products = await this.prisma.product.findMany({
			where: { id: { in: productIds } },
			include: {
				barProducts: {
					where: { barId },
					select: { price: true },
				},
			},
		});

		if (products.length !== productIds.length) {
			throw new NotFoundException('Some products not found');
		}

		// Вычисляем суммы для каждого товара и общую сумму
		let totalAmount = 0;
		const inventoryItems = items.map((item) => {
			const product = products.find((p) => p.id === item.productId);
			// Используем цену из BarProduct, если есть, иначе defaultPrice или costPrice
			const barProduct = product.barProducts[0];
			const price = barProduct?.price || product.defaultPrice || product.costPrice;
			const itemTotal = item.quantity * price;
			totalAmount += itemTotal;

			return {
				productId: item.productId,
				quantity: item.quantity,
				price,
				totalAmount: itemTotal,
			};
		});

		// Создаем инвентаризацию с товарами
		const inventory = await this.prisma.inventory.create({
			data: {
				barId,
				userId,
				comment: comment || null,
				totalAmount,
				items: {
					create: inventoryItems,
				},
			},
			include: {
				items: {
					include: {
						product: {
							include: {
								category: true,
							},
						},
					},
				},
				bar: true,
				user: {
					select: {
						id: true,
						name: true,
						role: true,
					},
				},
			},
		});

		return inventory;
	}

	async findAll(userId: string, userRole: string, filter: InventoryFilterDto) {
		const where: any = {};

		// Фильтр по бару
		if (filter.barId) {
			where.barId = filter.barId;
		}

		// Фильтр по дате
		if (filter.startDate || filter.endDate) {
			where.createdAt = {};
			if (filter.startDate) {
				where.createdAt.gte = new Date(filter.startDate);
			}
			if (filter.endDate) {
				where.createdAt.lte = new Date(filter.endDate);
			}
		}

		// Для WORKER показываем только инвентаризации их бара
		if (userRole === 'WORKER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (barIds.length > 0) {
				where.barId = { in: barIds };
			} else {
				return createPaginatedResponse([], 0, filter.page || 1, filter.limit || 10);
			}
		}

		// Для MANAGER показываем только инвентаризации их баров
		if (userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (barIds.length > 0) {
				if (filter.barId && !barIds.includes(filter.barId)) {
					throw new BadRequestException('Access denied to this bar');
				}
				if (!filter.barId) {
					where.barId = { in: barIds };
				}
			} else {
				return createPaginatedResponse([], 0, filter.page || 1, filter.limit || 10);
			}
		}

		const skip = getSkip(filter.page, filter.limit);
		const [data, total] = await Promise.all([
			this.prisma.inventory.findMany({
				where,
				skip,
				take: filter.limit || 10,
				orderBy: { createdAt: 'desc' },
				include: {
					items: {
						include: {
							product: {
								include: {
									category: true,
								},
							},
						},
					},
					bar: true,
					user: {
						select: {
							id: true,
							name: true,
							role: true,
						},
					},
				},
			}),
			this.prisma.inventory.count({ where }),
		]);

		return createPaginatedResponse(data, total, filter.page || 1, filter.limit || 10);
	}

	async findOne(id: string, userId: string, userRole: string) {
		const inventory = await this.prisma.inventory.findUnique({
			where: { id },
			include: {
				items: {
					include: {
						product: {
							include: {
								category: true,
							},
						},
					},
				},
				bar: true,
				user: {
					select: {
						id: true,
						name: true,
						role: true,
					},
				},
			},
		});

		if (!inventory) {
			throw new NotFoundException(`Inventory with ID ${id} not found`);
		}

		// Проверка доступа
		if (userRole === 'WORKER' || userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (!barIds.includes(inventory.barId)) {
				throw new BadRequestException('Access denied to this inventory');
			}
		}

		return inventory;
	}

	/**
	 * Получить предыдущую инвентаризацию для бара
	 */
	async findPreviousInventory(barId: string, currentInventoryId?: string) {
		const where: any = {
			barId,
		};

		// Исключаем текущую инвентаризацию
		if (currentInventoryId) {
			where.id = { not: currentInventoryId };
		}

		const previousInventory = await this.prisma.inventory.findFirst({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				items: {
					include: {
						product: {
							include: {
								category: true,
							},
						},
					},
				},
			},
		});

		return previousInventory;
	}

	/**
	 * Получить сравнение текущей инвентаризации с предыдущей
	 */
	async compareWithPrevious(inventoryId: string, userId: string, userRole: string) {
		const currentInventory = await this.findOne(inventoryId, userId, userRole);
		
		const previousInventory = await this.findPreviousInventory(
			currentInventory.barId,
			inventoryId,
		);

		if (!previousInventory) {
			return {
				current: currentInventory,
				previous: null,
				comparison: null,
			};
		}

		// Создаем мапу предыдущих позиций для быстрого поиска
		const previousItemsMap = new Map<string, typeof previousInventory.items[0]>(
			previousInventory.items.map((item) => [item.productId, item]),
		);

		// Сравниваем позиции
		const comparison = currentInventory.items.map((currentItem) => {
			const previousItem = previousItemsMap.get(currentItem.productId);
			
			if (!previousItem) {
				// Новый товар
				return {
					productId: currentItem.productId,
					product: currentItem.product,
					currentQuantity: currentItem.quantity,
					previousQuantity: null,
					difference: currentItem.quantity,
					currentAmount: currentItem.totalAmount,
					previousAmount: null,
					amountDifference: currentItem.totalAmount,
				};
			}

			// Товар был в предыдущей инвентаризации
			const quantityDiff = currentItem.quantity - previousItem.quantity;
			const amountDiff = currentItem.totalAmount - previousItem.totalAmount;

			return {
				productId: currentItem.productId,
				product: currentItem.product,
				currentQuantity: currentItem.quantity,
				previousQuantity: previousItem.quantity,
				difference: quantityDiff,
				currentAmount: currentItem.totalAmount,
				previousAmount: previousItem.totalAmount,
				amountDifference: amountDiff,
			};
		});

		// Добавляем товары, которые были в предыдущей, но отсутствуют в текущей
		const currentItemsMap = new Map(
			currentInventory.items.map((item) => [item.productId, item]),
		);

		previousInventory.items.forEach((previousItem) => {
			if (!currentItemsMap.has(previousItem.productId)) {
				comparison.push({
					productId: previousItem.productId,
					product: previousItem.product,
					currentQuantity: null,
					previousQuantity: previousItem.quantity,
					difference: -previousItem.quantity,
					currentAmount: null,
					previousAmount: previousItem.totalAmount,
					amountDifference: -previousItem.totalAmount,
				});
			}
		});

		return {
			current: currentInventory,
			previous: previousInventory,
			comparison,
			totalDifference: currentInventory.totalAmount - previousInventory.totalAmount,
		};
	}
}
