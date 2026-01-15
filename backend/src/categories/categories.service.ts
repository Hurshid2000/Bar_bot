import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SearchDto } from '../common/dto/search.dto';

@Injectable()
export class CategoriesService {
	constructor(private prisma: PrismaService) {}

	async create(createCategoryDto: CreateCategoryDto) {
		return this.prisma.category.create({
			data: {
				name: createCategoryDto.name,
			},
		});
	}

	async findAll(search?: SearchDto) {
		const where: any = {};
		if (search?.search) {
			where.name = {
				contains: search.search,
				mode: 'insensitive',
			};
		}

		return this.prisma.category.findMany({
			where,
			orderBy: {
				name: 'asc',
			},
		});
	}

	async findOne(id: string) {
		const category = await this.prisma.category.findUnique({
			where: { id },
		});

		if (!category) {
			throw new NotFoundException(`Category with ID ${id} not found`);
		}

		return category;
	}

	async update(id: string, updateCategoryDto: UpdateCategoryDto) {
		// Проверяем существование категории
		await this.findOne(id);

		return this.prisma.category.update({
			where: { id },
			data: updateCategoryDto,
		});
	}

	async remove(id: string) {
		// Проверяем существование категории
		await this.findOne(id);

		return this.prisma.category.delete({
			where: { id },
		});
	}
}
