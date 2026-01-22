import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarProductDto } from './dto/create-bar-product.dto';
import { UpdateBarProductDto } from './dto/update-bar-product.dto';

@Injectable()
export class BarProductsService {
	constructor(private prisma: PrismaService) {}

	async create(createBarProductDto: CreateBarProductDto) {
		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: createBarProductDto.barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${createBarProductDto.barId} not found`);
		}

		// Проверяем существование продукта
		const product = await this.prisma.product.findUnique({
			where: { id: createBarProductDto.productId },
		});
		if (!product) {
			throw new NotFoundException(`Product with ID ${createBarProductDto.productId} not found`);
		}

		// Проверяем, не существует ли уже связь
		const existing = await this.prisma.barProduct.findUnique({
			where: {
				barId_productId: {
					barId: createBarProductDto.barId,
					productId: createBarProductDto.productId,
				},
			},
		});
		if (existing) {
			throw new ConflictException('Product is already assigned to this bar');
		}

		// Если цена не указана, используем defaultPrice из продукта
		const price = createBarProductDto.price ?? product.defaultPrice;
		if (price == null) {
			throw new NotFoundException('Price must be specified or product must have defaultPrice');
		}

		return this.prisma.barProduct.create({
			data: {
				barId: createBarProductDto.barId,
				productId: createBarProductDto.productId,
				price: price,
				isActive: createBarProductDto.isActive ?? true,
			},
			include: {
				bar: true,
				product: {
					include: {
						category: true,
					},
				},
			},
		});
	}

	async findByBar(barId: string) {
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		return this.prisma.barProduct.findMany({
			where: { barId },
			include: {
				product: {
					include: {
						category: true,
					},
				},
			},
			orderBy: {
				product: {
					name: 'asc',
				},
			},
		});
	}

	async findOne(id: string) {
		const barProduct = await this.prisma.barProduct.findUnique({
			where: { id },
			include: {
				bar: true,
				product: {
					include: {
						category: true,
					},
				},
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
				product: {
					include: {
						category: true,
					},
				},
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
				product: {
					include: {
						category: true,
					},
				},
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
				product: {
					include: {
						category: true,
					},
				},
			},
		});
	}

	async remove(id: string) {
		await this.findOne(id);

		return this.prisma.barProduct.delete({
			where: { id },
		});
	}

	async removeByBarAndProduct(barId: string, productId: string) {
		await this.findByBarAndProduct(barId, productId);

		return this.prisma.barProduct.delete({
			where: {
				barId_productId: { barId, productId },
			},
		});
	}

	// Добавить несколько продуктов в бар одновременно
	async assignProductsToBar(
		barId: string,
		products: { productId: string; price: number }[],
	) {
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		const results = await this.prisma.$transaction(
			products.map((p) =>
				this.prisma.barProduct.upsert({
					where: {
						barId_productId: { barId, productId: p.productId },
					},
					update: {
						price: p.price,
						isActive: true,
					},
					create: {
						barId,
						productId: p.productId,
						price: p.price,
						isActive: true,
					},
					include: {
						product: {
							include: {
								category: true,
							},
						},
					},
				}),
			),
		);

		return results;
	}
}
