import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
	constructor(
		private prisma: PrismaService,
		private notificationsService: NotificationsService,
	) {}

	async create(userId: string, createOrderDto: CreateOrderDto) {
		const { barId, items, comment } = createOrderDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		if (!items || items.length === 0) {
			throw new BadRequestException('Order must contain at least one item');
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

		// Создаем заказ с товарами
		const order = await this.prisma.order.create({
			data: {
				barId,
				userId,
				status: OrderStatus.NEW,
				comment: comment || null,
				items: {
					create: items.map((item) => {
						const product = products.find((p) => p.id === item.productId);
						// Используем цену из BarProduct, если есть, иначе defaultPrice
						const barProduct = product.barProducts[0];
						const price = barProduct?.price || product.defaultPrice || product.costPrice;

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

		// Отправляем уведомление о создании заказа
		try {
			await this.notificationsService.notifyOrderCreated(order);
		} catch (error) {
			// Логируем ошибку, но не прерываем создание заказа
			console.error('Failed to send order notification:', error);
			console.error('Order data:', JSON.stringify({
				id: order.id,
				barId: order.barId,
				hasBar: !!order.bar,
				barName: order.bar?.name,
				itemsCount: order.items?.length,
			}));
		}

		return order;
	}

	async findAll(userId: string, userRole: string, filter: OrderFilterDto) {
		const where: any = {};

		// Фильтр по бару
		if (filter.barId) {
			where.barId = filter.barId;
		}

		// Фильтр по статусу
		if (filter.status) {
			where.status = filter.status;
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

		// Для WORKER показываем только заказы их бара
		if (userRole === 'WORKER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (barIds.length > 0) {
				where.barId = { in: barIds };
			} else {
				// Если нет баров, возвращаем пустой результат
				return createPaginatedResponse([], 0, filter.page || 1, filter.limit || 10);
			}
		}

		// Для MANAGER показываем только заказы их баров
		if (userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (barIds.length > 0) {
				// Если есть фильтр по бару, проверяем доступ
				if (filter.barId && !barIds.includes(filter.barId)) {
					throw new BadRequestException('Access denied to this bar');
				}
				// Если нет фильтра, применяем фильтр по доступным барам
				if (!filter.barId) {
					where.barId = { in: barIds };
				}
			} else {
				return createPaginatedResponse([], 0, filter.page || 1, filter.limit || 10);
			}
		}

		const skip = getSkip(filter.page, filter.limit);
		const [data, total] = await Promise.all([
			this.prisma.order.findMany({
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
			this.prisma.order.count({ where }),
		]);

		return createPaginatedResponse(data, total, filter.page || 1, filter.limit || 10);
	}

	async findOne(id: string, userId: string, userRole: string) {
		const order = await this.prisma.order.findUnique({
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

		if (!order) {
			throw new NotFoundException(`Order with ID ${id} not found`);
		}

		// Проверка доступа
		if (userRole === 'WORKER' || userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (!barIds.includes(order.barId)) {
				throw new BadRequestException('Access denied to this order');
			}
		}

		return order;
	}

	async update(id: string, userId: string, userRole: string, updateOrderDto: UpdateOrderDto) {
		// Проверяем существование заказа
		const order = await this.findOne(id, userId, userRole);

		// Обновляем заказ
		return this.prisma.order.update({
			where: { id },
			data: updateOrderDto,
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
	}

	async remove(id: string, userId: string, userRole: string) {
		// Проверяем существование заказа
		await this.findOne(id, userId, userRole);

		return this.prisma.order.delete({
			where: { id },
		});
	}
}
