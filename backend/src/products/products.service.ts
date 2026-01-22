import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RoleType } from '@prisma/client';
import { ProductFilterDto } from '../common/dto/filter.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import { SearchDto } from '../common/dto/search.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';

@Injectable()
export class ProductsService {
	constructor(private prisma: PrismaService) {}

	async create(createProductDto: CreateProductDto) {
		// Проверяем существование категории
		const category = await this.prisma.category.findUnique({
			where: { id: createProductDto.categoryId },
		});
		if (!category) {
			throw new NotFoundException(
				`Category with ID ${createProductDto.categoryId} not found`,
			);
		}

		// Создаем продукт
		const product = await this.prisma.product.create({
			data: {
				name: createProductDto.name,
				barcode: createProductDto.barcode,
				type: createProductDto.type || 'PRODUCT',
				costPrice: createProductDto.costPrice,
				defaultPrice: createProductDto.defaultPrice,
				categoryId: createProductDto.categoryId,
				imageUrl: createProductDto.imageUrl,
				description: createProductDto.description,
			},
			include: {
				category: true,
			},
		});

		// Если указана defaultPrice, создаем BarProduct для всех активных баров
		if (createProductDto.defaultPrice != null) {
			const bars = await this.prisma.bar.findMany({
				where: { isActive: true },
			});

			if (bars.length > 0) {
				await this.prisma.barProduct.createMany({
					data: bars.map((bar) => ({
						barId: bar.id,
						productId: product.id,
						price: createProductDto.defaultPrice!,
						isActive: true,
					})),
					skipDuplicates: true,
				});
			}
		}

		return product;
	}

	async findAll(
		filter: ProductFilterDto,
		pagination: PaginationDto,
		userRole?: RoleType,
		search?: SearchDto,
	): Promise<PaginatedResponse<any>> {
		const { barId, categoryId, type } = filter;
		const { page = 1, limit = 20 } = pagination;
		const searchTerm = search?.search;

		const where: any = {};
		if (categoryId) where.categoryId = categoryId;
		if (type) where.type = type;

		// Если указан barId, фильтруем по продуктам, которые есть в этом баре
		if (barId) {
			where.barProducts = {
				some: {
					barId,
					isActive: true,
				},
			};
		}

		// Поиск по имени и barcode
		if (searchTerm) {
			where.OR = [
				{ name: { contains: searchTerm, mode: 'insensitive' } },
				{ barcode: { contains: searchTerm, mode: 'insensitive' } },
			];
		}

		const [products, total] = await Promise.all([
			this.prisma.product.findMany({
				where,
				include: {
					category: true,
					barProducts: barId
						? {
								where: { barId, isActive: true },
								include: { bar: true },
							}
						: {
								include: { bar: true },
							},
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.product.count({ where }),
		]);

		// Преобразуем продукты: добавляем price из barProduct если есть barId
		let processedProducts = products.map((product) => {
			const barProduct = barId
				? product.barProducts.find((bp) => bp.barId === barId)
				: null;

			const result: any = {
				...product,
				price: barProduct?.price ?? null,
				barProduct: barProduct ?? null,
			};

			// WORKER не должен видеть costPrice
			if (userRole === RoleType.WORKER) {
				delete result.costPrice;
			}

			return result;
		});

		return createPaginatedResponse(processedProducts, total, page, limit);
	}

	async findOne(id: string, userRole?: RoleType, barId?: string) {
		const product = await this.prisma.product.findUnique({
			where: { id },
			include: {
				category: true,
				barProducts: {
					include: { bar: true },
				},
			},
		});

		if (!product) {
			throw new NotFoundException(`Product with ID ${id} not found`);
		}

		// Если указан barId, добавляем price из barProduct
		const barProduct = barId
			? product.barProducts.find((bp) => bp.barId === barId)
			: null;

		const result: any = {
			...product,
			price: barProduct?.price ?? null,
			barProduct: barProduct ?? null,
		};

		// WORKER не должен видеть costPrice
		if (userRole === RoleType.WORKER) {
			delete result.costPrice;
		}

		return result;
	}

	async findByBar(
		barId: string,
		pagination: PaginationDto,
		userRole?: RoleType,
	): Promise<PaginatedResponse<any>> {
		return this.findAll({ barId }, pagination, userRole);
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
			include: {
				category: true,
			},
		});
	}

	async remove(id: string) {
		// Проверяем существование продукта
		await this.findOne(id);

		// Сначала удаляем все связи с барами
		await this.prisma.barProduct.deleteMany({
			where: { productId: id },
		});

		return this.prisma.product.delete({
			where: { id },
		});
	}
}
