import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateArrivalDto } from './dto/create-arrival.dto';
import { ArrivalFilterDto } from './dto/arrival-filter.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';
import { ArrivalType } from '@prisma/client';
import { StockService } from '../stock/stock.service';

@Injectable()
export class ArrivalsService {
	constructor(
		private prisma: PrismaService,
		private notificationsService: NotificationsService,
		private stockService: StockService,
	) {}

	async create(userId: string, createArrivalDto: CreateArrivalDto) {
		const { barId, type, items, comment } = createArrivalDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		if (!items || items.length === 0) {
			throw new BadRequestException('Arrival must contain at least one item');
		}

		// Получаем информацию о продуктах и ценах
		const productIds = items.map((item) => item.productId);
		const products = await this.prisma.product.findMany({
			where: { id: { in: productIds } },
			include: {
				barProducts: {
					where: { barId, isActive: true },
					select: { price: true },
				},
			},
		});

		if (products.length !== productIds.length) {
			throw new NotFoundException('Some products not found');
		}

		// Запрещаем смешивать спортпит с другими типами товаров
		const hasSportPit = products.some((p) => p.type === 'SPORT_PIT');
		const hasOther = products.some((p) => p.type !== 'SPORT_PIT');
		if (hasSportPit && hasOther) {
			throw new BadRequestException(
				'Нельзя смешивать спортпит с другими товарами в одном приходе. Создайте отдельные приходы.',
			);
		}
		const isSportPit = hasSportPit;

		// Создаем приход/списание с товарами
		const arrival = await this.prisma.arrival.create({
			data: {
				barId,
				userId,
				type,
				isSportPit,
				comment: comment || null,
				items: {
					create: items.map((item) => {
						const product = products.find((p) => p.id === item.productId);
						// Используем цену из BarProduct, если есть, иначе defaultPrice или costPrice
						const barProduct = product.barProducts[0];
						const price = barProduct?.price || product.defaultPrice || (product.costPrice ?? 0);

						return {
							productId: item.productId,
							quantity: item.quantity,
							price,
						};
					}),
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

		// Обновляем остатки на складе
		try {
			for (const item of arrival.items) {
				if (type === ArrivalType.ARRIVAL) {
					await this.stockService.increase(barId, item.productId, item.quantity);
				} else if (type === ArrivalType.WRITE_OFF) {
					await this.stockService.decrease(barId, item.productId, item.quantity);
				}
			}
		} catch (error) {
			console.error('Failed to update stock:', error);
		}

		// Отправляем уведомление о создании прихода/списания
		try {
			await this.notificationsService.notifyArrivalCreated(arrival);
		} catch (error) {
			console.error('Failed to send arrival notification:', error);
		}

		return arrival;
	}

	async findAll(userId: string, userRole: string, filter: ArrivalFilterDto) {
		const where: any = {};

		// Фильтр по бару
		if (filter.barId) {
			where.barId = filter.barId;
		}

		// Фильтр по типу
		if (filter.type) {
			where.type = filter.type;
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

		// Для WORKER показываем только приходы их бара
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

		// Для MANAGER показываем только приходы их баров
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
			this.prisma.arrival.findMany({
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
			this.prisma.arrival.count({ where }),
		]);

		return createPaginatedResponse(data, total, filter.page || 1, filter.limit || 10);
	}

	/**
	 * Сводный список приходов/списаний за период с группировкой по товарам.
	 * Возвращает: [{ productId, productName, productType, totalQuantity, deliveriesCount, totalAmount }]
	 */
	async getSummary(
		userId: string,
		userRole: string,
		filter: ArrivalFilterDto,
	) {
		const where: any = {
			type: filter.type || ArrivalType.ARRIVAL,
		};

		if (filter.barId) {
			where.barId = filter.barId;
		}

		if (filter.startDate || filter.endDate) {
			where.createdAt = {};
			if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
			if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
		}

		// Ограничения доступа по роли
		if (userRole === 'WORKER' || userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (barIds.length === 0) return { items: [], totalDeliveries: 0 };

			if (userRole === 'MANAGER' && filter.barId && !barIds.includes(filter.barId)) {
				throw new BadRequestException('Access denied to this bar');
			}
			if (!filter.barId) {
				where.barId = { in: barIds };
			}
		}

		const arrivals = await this.prisma.arrival.findMany({
			where,
			include: {
				items: {
					include: {
						product: {
							select: { id: true, name: true, type: true },
						},
					},
				},
			},
		});

		// Группируем по productId
		const map = new Map<
			string,
			{
				productId: string;
				productName: string;
				productType: string;
				totalQuantity: number;
				deliveriesCount: number;
				totalAmount: number;
			}
		>();

		for (const arrival of arrivals) {
			const productIdsInArrival = new Set<string>();
			for (const item of arrival.items) {
				const product = item.product;
				if (!product) continue;
				const existing = map.get(product.id);
				if (existing) {
					existing.totalQuantity += item.quantity;
					existing.totalAmount += item.price * item.quantity;
					if (!productIdsInArrival.has(product.id)) {
						existing.deliveriesCount += 1;
					}
				} else {
					map.set(product.id, {
						productId: product.id,
						productName: product.name,
						productType: product.type,
						totalQuantity: item.quantity,
						totalAmount: item.price * item.quantity,
						deliveriesCount: 1,
					});
				}
				productIdsInArrival.add(product.id);
			}
		}

		const items = Array.from(map.values()).sort(
			(a, b) => b.totalQuantity - a.totalQuantity,
		);

		return {
			items,
			totalDeliveries: arrivals.length,
		};
	}

	async findOne(id: string, userId: string, userRole: string) {
		const arrival = await this.prisma.arrival.findUnique({
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

		if (!arrival) {
			throw new NotFoundException(`Arrival with ID ${id} not found`);
		}

		// Проверка доступа
		if (userRole === 'WORKER' || userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (!barIds.includes(arrival.barId)) {
				throw new BadRequestException('Access denied to this arrival');
			}
		}

		return arrival;
	}
}
