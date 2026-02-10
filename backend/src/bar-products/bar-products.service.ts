import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarProductDto } from './dto/create-bar-product.dto';
import { UpdateBarProductDto } from './dto/update-bar-product.dto';

@Injectable()
export class BarProductsService {
	constructor(private prisma: PrismaService) {}

	/**
	 * Добавить товар в бар.
	 * Если BarProduct уже есть и isActive=false — реактивируем.
	 * Если нет — создаём с price из dto или из Product.defaultPrice.
	 */
	async create(createBarProductDto: CreateBarProductDto) {
		const bar = await this.prisma.bar.findUnique({
			where: { id: createBarProductDto.barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${createBarProductDto.barId} not found`);
		}

		const product = await this.prisma.product.findUnique({
			where: { id: createBarProductDto.productId },
		});
		if (!product) {
			throw new NotFoundException(`Product with ID ${createBarProductDto.productId} not found`);
		}

		// Проверяем, есть ли уже запись (в т.ч. неактивная)
		const existing = await this.prisma.barProduct.findUnique({
			where: {
				barId_productId: {
					barId: createBarProductDto.barId,
					productId: createBarProductDto.productId,
				},
			},
		});

		if (existing) {
			if (existing.isActive) {
				throw new ConflictException('Продукт уже добавлен в этот бар');
			}
			// Реактивируем неактивный BarProduct
			return this.prisma.barProduct.update({
				where: { id: existing.id },
				data: {
					isActive: true,
					price: createBarProductDto.price ?? existing.price,
				},
				include: {
					bar: true,
					product: { include: { category: true } },
				},
			});
		}

		// Определяем цену: dto.price → defaultPrice → costPrice
		const price = createBarProductDto.price ?? product.defaultPrice ?? product.costPrice;
		if (price == null) {
			throw new BadRequestException('Необходимо указать цену или продукт должен иметь defaultPrice');
		}

		return this.prisma.barProduct.create({
			data: {
				barId: createBarProductDto.barId,
				productId: createBarProductDto.productId,
				price,
				isActive: createBarProductDto.isActive ?? true,
			},
			include: {
				bar: true,
				product: { include: { category: true } },
			},
		});
	}

	/**
	 * Получить список товаров бара.
	 * По умолчанию только isActive=true.
	 * includeInactive=true — все (и отключённые).
	 */
	async findByBar(barId: string, includeInactive = false) {
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		const where: any = { barId };
		if (!includeInactive) {
			where.isActive = true;
		}

		return this.prisma.barProduct.findMany({
			where,
			include: {
				product: { include: { category: true } },
			},
			orderBy: {
				product: { name: 'asc' },
			},
		});
	}

	async findOne(id: string) {
		const barProduct = await this.prisma.barProduct.findUnique({
			where: { id },
			include: {
				bar: true,
				product: { include: { category: true } },
			},
		});

		if (!barProduct) {
			throw new NotFoundException(`BarProduct with ID ${id} not found`);
		}

		return barProduct;
	}

	async findByBarAndProduct(barId: string, productId: string) {
		const barProduct = await this.prisma.barProduct.findUnique({
			where: {
				barId_productId: { barId, productId },
			},
			include: {
				bar: true,
				product: { include: { category: true } },
			},
		});

		if (!barProduct) {
			throw new NotFoundException(`Product is not assigned to this bar`);
		}

		return barProduct;
	}

	async update(id: string, updateBarProductDto: UpdateBarProductDto) {
		await this.findOne(id);

		return this.prisma.barProduct.update({
			where: { id },
			data: updateBarProductDto,
			include: {
				bar: true,
				product: { include: { category: true } },
			},
		});
	}

	async updateByBarAndProduct(
		barId: string,
		productId: string,
		updateBarProductDto: UpdateBarProductDto,
	) {
		await this.findByBarAndProduct(barId, productId);

		return this.prisma.barProduct.update({
			where: {
				barId_productId: { barId, productId },
			},
			data: updateBarProductDto,
			include: {
				bar: true,
				product: { include: { category: true } },
			},
		});
	}

	/**
	 * Мягкое удаление — isActive=false (не физическое)
	 */
	async deactivate(id: string) {
		await this.findOne(id);

		return this.prisma.barProduct.update({
			where: { id },
			data: { isActive: false },
			include: {
				bar: true,
				product: { include: { category: true } },
			},
		});
	}

	/**
	 * Мягкое удаление по barId + productId
	 */
	async deactivateByBarAndProduct(barId: string, productId: string) {
		await this.findByBarAndProduct(barId, productId);

		return this.prisma.barProduct.update({
			where: {
				barId_productId: { barId, productId },
			},
			data: { isActive: false },
			include: {
				bar: true,
				product: { include: { category: true } },
			},
		});
	}

	/**
	 * Добавить несколько продуктов в бар.
	 * Если BarProduct уже есть и isActive=false — реактивируем.
	 * Цена: из body → defaultPrice → costPrice.
	 */
	async assignProductsToBar(
		barId: string,
		products: { productId: string; price?: number }[],
	) {
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		// Получаем все продукты для определения цен
		const productIds = products.map((p) => p.productId);
		const dbProducts = await this.prisma.product.findMany({
			where: { id: { in: productIds } },
		});
		const productMap = new Map(dbProducts.map((p) => [p.id, p]));

		const results = await this.prisma.$transaction(
			products.map((p) => {
				const dbProduct = productMap.get(p.productId);
				const price = p.price ?? dbProduct?.defaultPrice ?? dbProduct?.costPrice ?? 0;

				return this.prisma.barProduct.upsert({
					where: {
						barId_productId: { barId, productId: p.productId },
					},
					update: {
						price,
						isActive: true,
					},
					create: {
						barId,
						productId: p.productId,
						price,
						isActive: true,
					},
					include: {
						product: { include: { category: true } },
					},
				});
			}),
		);

		return results;
	}
}
