import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CreatePurchaseItemDto } from './dto/create-purchase-item.dto';
import { PurchaseFilterDto } from '../common/dto/filter.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';

@Injectable()
export class PurchasesService {
	constructor(private prisma: PrismaService) {}

	/**
	 * Считает данные позиций и итоговую сумму закупа.
	 * Сумма = Σ (кол-во × ПРОДАЖНАЯ цена: BarProduct.price ?? defaultPrice).
	 */
	private async buildItems(
		tx: Prisma.TransactionClient,
		barId: string,
		items: CreatePurchaseItemDto[],
	): Promise<{ purchaseItemsData: { name: string; amount: number }[]; totalAmount: number }> {
		const productIds = items.map((item) => item.productId);
		const products = await tx.product.findMany({
			where: { id: { in: productIds } },
			include: { barProducts: { where: { barId, isActive: true } } },
		});

		if (products.length !== new Set(productIds).size) {
			const foundIds = products.map((p) => p.id);
			const missingIds = productIds.filter((id) => !foundIds.includes(id));
			throw new NotFoundException(
				`Products with IDs [${missingIds.join(', ')}] not found`,
			);
		}

		const productMap = new Map(products.map((p) => [p.id, p]));
		let totalAmount = 0;

		const purchaseItemsData = items.map((item) => {
			const product = productMap.get(item.productId);
			if (!product) {
				throw new NotFoundException(`Product ${item.productId} not found`);
			}
			const barProduct = product.barProducts?.[0];
			const price = barProduct?.price ?? product.defaultPrice ?? 0;
			totalAmount += price * item.quantity;

			return {
				name: JSON.stringify({
					productName: product.name,
					productType: product.type,
					productId: product.id,
					price,
					costPrice: product.costPrice ?? 0,
					quantity: item.quantity,
				}),
				amount: item.quantity,
			};
		});

		return { purchaseItemsData, totalAmount };
	}

	async create(createPurchaseDto: CreatePurchaseDto) {
		const { barId, items } = createPurchaseDto;

		const bar = await this.prisma.bar.findUnique({ where: { id: barId } });
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		return this.prisma.$transaction(async (tx) => {
			const { purchaseItemsData, totalAmount } = await this.buildItems(tx, barId, items);

			return tx.purchase.create({
				data: {
					bar: { connect: { id: barId } },
					totalAmount,
					items: { create: purchaseItemsData },
				},
				include: { items: true },
			});
		});
	}

	async findOne(id: string) {
		const purchase = await this.prisma.purchase.findUnique({
			where: { id },
			include: { items: true, supplier: true },
		});
		if (!purchase) {
			throw new NotFoundException(`Purchase with ID ${id} not found`);
		}
		return purchase;
	}

	/**
	 * Правка закупа: заменяем позиции целиком и пересчитываем сумму.
	 * Склад не затрагивается (у обычных товаров склада нет).
	 */
	async update(id: string, dto: UpdatePurchaseDto) {
		const purchase = await this.prisma.purchase.findUnique({ where: { id } });
		if (!purchase) {
			throw new NotFoundException(`Purchase with ID ${id} not found`);
		}

		return this.prisma.$transaction(async (tx) => {
			const { purchaseItemsData, totalAmount } = await this.buildItems(
				tx,
				purchase.barId,
				dto.items,
			);

			await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

			return tx.purchase.update({
				where: { id },
				data: {
					totalAmount,
					items: { create: purchaseItemsData },
				},
				include: { items: true },
			});
		});
	}

	async remove(id: string) {
		const purchase = await this.prisma.purchase.findUnique({ where: { id } });
		if (!purchase) {
			throw new NotFoundException(`Purchase with ID ${id} not found`);
		}
		await this.prisma.$transaction([
			this.prisma.purchaseItem.deleteMany({ where: { purchaseId: id } }),
			this.prisma.purchase.delete({ where: { id } }),
		]);
		return { id };
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
