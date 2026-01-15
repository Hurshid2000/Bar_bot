import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarDto } from './dto/create-bar.dto';
import { UpdateBarDto } from './dto/update-bar.dto';

@Injectable()
export class BarsService {
	constructor(private prisma: PrismaService) {}

	async create(createBarDto: CreateBarDto) {
		return this.prisma.bar.create({
			data: {
				name: createBarDto.name,
				isActive: createBarDto.isActive ?? true,
			},
		});
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
