import {
	Injectable,
	NotFoundException,
	BadRequestException,
	Inject,
	forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateArrivalDto } from './dto/create-arrival.dto';
import { UpdateArrivalDto } from './dto/update-arrival.dto';
import { ArrivalFilterDto } from './dto/arrival-filter.dto';
import type { Prisma } from '@prisma/client';
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
		@Inject(forwardRef(() => NotificationsService))
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
		const type = filter.type || ArrivalType.ARRIVAL;

		// Фильтр по дате (общий для приходов и закупов)
		const dateWhere: any = {};
		if (filter.startDate || filter.endDate) {
			dateWhere.createdAt = {};
			if (filter.startDate) dateWhere.createdAt.gte = new Date(filter.startDate);
			if (filter.endDate) dateWhere.createdAt.lte = new Date(filter.endDate);
		}

		// Ограничение по барам (роль)
		let barFilter: any = filter.barId ? filter.barId : undefined;
		if (userRole === 'WORKER' || userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			const barIds = userBars.map((ub) => ub.barId);
			if (barIds.length === 0)
				return { items: [], totalDeliveries: 0, deliveries: [] };

			if (userRole === 'MANAGER' && filter.barId && !barIds.includes(filter.barId)) {
				throw new BadRequestException('Access denied to this bar');
			}
			if (!filter.barId) {
				barFilter = { in: barIds };
			}
		}

		// Группировка по productId
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

		const addItem = (
			productId: string,
			productName: string,
			productType: string,
			quantity: number,
			amount: number,
			isNewDelivery: boolean,
		) => {
			const existing = map.get(productId);
			if (existing) {
				existing.totalQuantity += quantity;
				existing.totalAmount += amount;
				if (isNewDelivery) existing.deliveriesCount += 1;
			} else {
				map.set(productId, {
					productId,
					productName,
					productType,
					totalQuantity: quantity,
					totalAmount: amount,
					deliveriesCount: 1,
				});
			}
		};

		// Список каждой поставки отдельно (приход/списание/закуп) с датой
		type DeliveryItem = {
			productId: string;
			productName: string;
			productType: string;
			quantity: number;
			price: number;
			amount: number;
		};
		type Delivery = {
			id: string;
			source: 'arrival' | 'purchase';
			type: string;
			date: Date;
			comment: string | null;
			itemsCount: number;
			totalAmount: number;
			items: DeliveryItem[];
		};
		const deliveries: Delivery[] = [];

		// --- 1. Приходы/списания (таблица Arrival) ---
		const arrivalWhere: any = { type, ...dateWhere };
		if (barFilter !== undefined) arrivalWhere.barId = barFilter;

		const arrivals = await this.prisma.arrival.findMany({
			where: arrivalWhere,
			include: {
				items: {
					include: {
						product: { select: { id: true, name: true, type: true } },
					},
				},
			},
		});

		for (const arrival of arrivals) {
			const seen = new Set<string>();
			const dItems: DeliveryItem[] = [];
			let dTotal = 0;
			for (const item of arrival.items) {
				const product = item.product;
				if (!product) continue;
				const amount = item.price * item.quantity;
				addItem(
					product.id,
					product.name,
					product.type,
					item.quantity,
					amount,
					!seen.has(product.id),
				);
				seen.add(product.id);
				dItems.push({
					productId: product.id,
					productName: product.name,
					productType: product.type,
					quantity: item.quantity,
					price: item.price,
					amount,
				});
				dTotal += amount;
			}
			deliveries.push({
				id: arrival.id,
				source: 'arrival',
				type: arrival.type,
				date: arrival.createdAt,
				comment: arrival.comment,
				itemsCount: dItems.length,
				totalAmount: dTotal,
				items: dItems,
			});
		}

		let totalDeliveries = arrivals.length;

		// --- 2. Закупы (таблица Purchase) — только для прихода ---
		// Закуп всегда означает поступление товара, поэтому включаем его
		// в сводку приходов. Для списаний (WRITE_OFF) закупы не учитываем.
		if (type === ArrivalType.ARRIVAL) {
			const purchaseWhere: any = { ...dateWhere };
			if (barFilter !== undefined) purchaseWhere.barId = barFilter;

			const purchases = await this.prisma.purchase.findMany({
				where: purchaseWhere,
				include: { items: true },
			});

			for (const purchase of purchases) {
				const seen = new Set<string>();
				const dItems: DeliveryItem[] = [];
				let dTotal = 0;
				for (const it of purchase.items) {
					const parsed = this.parsePurchaseItem(it);
					const amount = parsed.price * parsed.quantity;
					addItem(
						parsed.productId,
						parsed.productName,
						parsed.productType,
						parsed.quantity,
						amount,
						!seen.has(parsed.productId),
					);
					seen.add(parsed.productId);
					dItems.push({
						productId: parsed.productId,
						productName: parsed.productName,
						productType: parsed.productType,
						quantity: parsed.quantity,
						price: parsed.price,
						amount,
					});
					dTotal += amount;
				}
				deliveries.push({
					id: purchase.id,
					source: 'purchase',
					type: ArrivalType.ARRIVAL,
					date: purchase.createdAt,
					comment: null,
					itemsCount: dItems.length,
					totalAmount: dTotal,
					items: dItems,
				});
			}

			totalDeliveries += purchases.length;
		}

		const items = Array.from(map.values()).sort(
			(a, b) => b.totalQuantity - a.totalQuantity,
		);

		// Поставки — новейшие сверху
		deliveries.sort((a, b) => b.date.getTime() - a.date.getTime());

		return {
			items,
			totalDeliveries,
			deliveries,
		};
	}

	/**
	 * Разбирает позицию закупа. Начиная с последних версий поле `name`
	 * хранит JSON { productName, productType, productId, price, quantity }.
	 * Для старых записей (plain-строка) бережно откатываемся к сырому имени.
	 */
	private parsePurchaseItem(it: { name: string; amount: number }): {
		productId: string;
		productName: string;
		productType: string;
		price: number;
		quantity: number;
	} {
		try {
			const d = JSON.parse(it.name);
			if (d && d.productId) {
				return {
					productId: String(d.productId),
					productName: String(d.productName ?? 'Без названия'),
					productType: String(d.productType ?? 'PRODUCT'),
					price: Number(d.price) || 0,
					quantity: Number(d.quantity ?? it.amount) || 0,
				};
			}
		} catch {
			// старый формат — name это просто строка
		}
		return {
			productId: `raw:${it.name}`,
			productName: it.name,
			productType: 'PRODUCT',
			price: 0,
			quantity: Number(it.amount) || 0,
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

	private async assertBarAccess(userId: string, userRole: string, barId: string) {
		if (userRole === 'WORKER' || userRole === 'MANAGER') {
			const userBars = await this.prisma.userBar.findMany({
				where: { userId },
				select: { barId: true },
			});
			if (!userBars.map((ub) => ub.barId).includes(barId)) {
				throw new BadRequestException('Access denied to this arrival');
			}
		}
	}

	/** Прибавляет/убавляет остаток с защитой от ухода в минус. */
	private async applyStockDelta(
		tx: Prisma.TransactionClient,
		barId: string,
		productId: string,
		delta: number,
	) {
		const cur = await tx.stock.findUnique({
			where: { barId_productId: { barId, productId } },
		});
		const q = Math.max(0, (cur?.quantity ?? 0) + delta);
		await tx.stock.upsert({
			where: { barId_productId: { barId, productId } },
			create: { barId, productId, quantity: q },
			update: { quantity: q },
		});
	}

	/** Знак влияния операции на склад: приход +, списание −. */
	private stockSign(type: ArrivalType): number {
		return type === ArrivalType.ARRIVAL ? 1 : -1;
	}

	/**
	 * Правка прихода/списания: откатываем старое влияние на склад,
	 * заменяем позиции и применяем новое влияние.
	 */
	async update(
		id: string,
		userId: string,
		userRole: string,
		dto: UpdateArrivalDto,
	) {
		const arrival = await this.prisma.arrival.findUnique({
			where: { id },
			include: { items: true },
		});
		if (!arrival) {
			throw new NotFoundException(`Arrival with ID ${id} not found`);
		}
		await this.assertBarAccess(userId, userRole, arrival.barId);

		const newType = dto.type ?? arrival.type;
		const barId = arrival.barId;
		const items = dto.items ?? [];
		if (items.length === 0) {
			throw new BadRequestException('Arrival must contain at least one item');
		}

		// Получаем продукты и цены (как при создании)
		const productIds = items.map((i) => i.productId);
		const products = await this.prisma.product.findMany({
			where: { id: { in: productIds } },
			include: { barProducts: { where: { barId, isActive: true }, select: { price: true } } },
		});
		if (products.length !== new Set(productIds).size) {
			throw new NotFoundException('Some products not found');
		}
		const hasSportPit = products.some((p) => p.type === 'SPORT_PIT');
		const hasOther = products.some((p) => p.type !== 'SPORT_PIT');
		if (hasSportPit && hasOther) {
			throw new BadRequestException(
				'Нельзя смешивать спортпит с другими товарами в одном приходе.',
			);
		}

		return this.prisma.$transaction(async (tx) => {
			// 1. Откатываем влияние старых позиций на склад
			const oldSign = this.stockSign(arrival.type);
			for (const it of arrival.items) {
				await this.applyStockDelta(tx, barId, it.productId, -oldSign * it.quantity);
			}

			// 2. Удаляем старые позиции
			await tx.arrivalItem.deleteMany({ where: { arrivalId: id } });

			// 3. Создаём новые позиции с ценами из каталога
			const newSign = this.stockSign(newType);
			for (const item of items) {
				const product = products.find((p) => p.id === item.productId)!;
				const barProduct = product.barProducts[0];
				const price = barProduct?.price || product.defaultPrice || (product.costPrice ?? 0);
				await tx.arrivalItem.create({
					data: { arrivalId: id, productId: item.productId, quantity: item.quantity, price },
				});
				// 4. Применяем новое влияние на склад
				await this.applyStockDelta(tx, barId, item.productId, newSign * item.quantity);
			}

			// 5. Обновляем сам приход
			return tx.arrival.update({
				where: { id },
				data: {
					type: newType,
					isSportPit: hasSportPit,
					comment: dto.comment !== undefined ? dto.comment || null : undefined,
				},
				include: {
					items: { include: { product: { include: { category: true } } } },
					bar: true,
					user: { select: { id: true, name: true, role: true } },
				},
			});
		});
	}

	/** Удаление прихода/списания — откатывает влияние на склад. */
	async remove(id: string, userId: string, userRole: string) {
		const arrival = await this.prisma.arrival.findUnique({
			where: { id },
			include: { items: true },
		});
		if (!arrival) {
			throw new NotFoundException(`Arrival with ID ${id} not found`);
		}
		await this.assertBarAccess(userId, userRole, arrival.barId);

		await this.prisma.$transaction(async (tx) => {
			const sign = this.stockSign(arrival.type);
			for (const it of arrival.items) {
				await this.applyStockDelta(tx, arrival.barId, it.productId, -sign * it.quantity);
			}
			await tx.arrivalItem.deleteMany({ where: { arrivalId: id } });
			await tx.arrival.delete({ where: { id } });
		});
		return { id };
	}
}
