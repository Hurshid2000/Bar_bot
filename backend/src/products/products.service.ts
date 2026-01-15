import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
		if (barId) where.barId = barId;
		if (categoryId) where.categoryId = categoryId;
		if (type) where.type = type;

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
					bar: true,
					category: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.product.count({ where }),
		]);

		// WORKER не должен видеть costPrice
		let processedProducts: any[] = products;
		if (userRole === RoleType.WORKER) {
			processedProducts = products.map((product) => {
				const { costPrice, ...productWithoutCostPrice } = product;
				return productWithoutCostPrice;
			});
		}

		return createPaginatedResponse(processedProducts, total, page, limit);
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
