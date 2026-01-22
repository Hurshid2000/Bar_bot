import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarDto } from './dto/create-bar.dto';
import { UpdateBarDto } from './dto/update-bar.dto';

@Injectable()
export class BarsService {
	constructor(private prisma: PrismaService) {}

	async create(createBarDto: CreateBarDto) {
		// Создаем бар
		const bar = await this.prisma.bar.create({
			data: {
				name: createBarDto.name,
				isActive: createBarDto.isActive ?? true,
			},
		});

		// Получаем все продукты с defaultPrice и создаем для них BarProduct
		const productsWithDefaultPrice = await this.prisma.product.findMany({
			where: {
				defaultPrice: { not: null },
			},
		});

		if (productsWithDefaultPrice.length > 0) {
			await this.prisma.barProduct.createMany({
				data: productsWithDefaultPrice.map((product) => ({
					barId: bar.id,
					productId: product.id,
					price: product.defaultPrice!,
					isActive: true,
				})),
				skipDuplicates: true,
			});
		}

		return bar;
	}

	async findAll() {
		return this.prisma.bar.findMany({
			orderBy: {
				createdAt: 'desc',
			},
		});
	}

	async findOne(id: string) {
		const bar = await this.prisma.bar.findUnique({
			where: { id },
		});

		if (!bar) {
			throw new NotFoundException(`Bar with ID ${id} not found`);
		}

		return bar;
	}

	async update(id: string, updateBarDto: UpdateBarDto) {
		// Проверяем существование бара
		await this.findOne(id);

		return this.prisma.bar.update({
			where: { id },
			data: updateBarDto,
		});
	}

	async remove(id: string) {
		// Проверяем существование бара
		await this.findOne(id);

		return this.prisma.bar.delete({
			where: { id },
		});
	}
}
