import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseFilterDto } from '../common/dto/filter.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';

@Injectable()
export class ExpensesService {
	constructor(private prisma: PrismaService) {}

	async create(createExpenseDto: CreateExpenseDto) {
		const { barId } = createExpenseDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		return this.prisma.expense.create({
			data: createExpenseDto,
		});
	}

	async findAll(
		filter: ExpenseFilterDto,
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

		const [expenses, total] = await Promise.all([
			this.prisma.expense.findMany({
				where,
				orderBy: {
					createdAt: 'desc',
				},
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.expense.count({ where }),
		]);

		return createPaginatedResponse(expenses, total, page, limit);
	}
}
