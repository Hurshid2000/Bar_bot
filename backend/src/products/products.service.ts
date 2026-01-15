import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RoleType } from '@prisma/client';

@Injectable()
export class ProductsService {
	constructor(private prisma: PrismaService) {}

	async create(createProductDto: CreateProductDto) {
		// Проверяем существование бара и категории
		const bar = await this.prisma.bar.findUnique({
			where: { id: createProductDto.barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${createProductDto.barId} not found`);
		}

		const category = await this.prisma.category.findUnique({
			where: { id: createProductDto.categoryId },
		});
		if (!category) {
			throw new NotFoundException(
				`Category with ID ${createProductDto.categoryId} not found`,
			);
		}

		return this.prisma.product.create({
			data: {
				name: createProductDto.name,
				barcode: createProductDto.barcode,
				type: createProductDto.type || 'PRODUCT',
				costPrice: createProductDto.costPrice,
				price: createProductDto.price,
				barId: createProductDto.barId,
				categoryId: createProductDto.categoryId,
			},
		});
	}

	async findAll(barId?: string, userRole?: RoleType) {
		const where = barId ? { barId } : {};

		const products = await this.prisma.product.findMany({
			where,
			include: {
				bar: true,
				category: true,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		// WORKER не должен видеть costPrice
		if (userRole === RoleType.WORKER) {
			return products.map((product) => {
				const { costPrice, ...productWithoutCostPrice } = product;
				return productWithoutCostPrice;
			});
		}

		return products;
	}

	async findOne(id: string, userRole?: RoleType) {
		const product = await this.prisma.product.findUnique({
			where: { id },
			include: {
				bar: true,
				category: true,
			},
		});

		if (!product) {
			throw new NotFoundException(`Product with ID ${id} not found`);
		}

		// WORKER не должен видеть costPrice
		if (userRole === RoleType.WORKER) {
			const { costPrice, ...productWithoutCostPrice } = product;
			return productWithoutCostPrice;
		}

		return product;
	}

	async findByBar(barId: string, userRole?: RoleType) {
		return this.findAll(barId, userRole);
	}

	async update(id: string, updateProductDto: UpdateProductDto) {
		// Проверяем существование продукта
		await this.findOne(id);

		// Если обновляется categoryId, проверяем существование категории
		if (updateProductDto.categoryId) {
			const category = await this.prisma.category.findUnique({
				where: { id: updateProductDto.categoryId },
			});
			if (!category) {
				throw new NotFoundException(
					`Category with ID ${updateProductDto.categoryId} not found`,
				);
			}
		}

		return this.prisma.product.update({
			where: { id },
			data: updateProductDto,
		});
	}

	async remove(id: string) {
		// Проверяем существование продукта
		await this.findOne(id);

		return this.prisma.product.delete({
			where: { id },
		});
	}
}
