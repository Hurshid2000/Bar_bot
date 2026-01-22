import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';
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
	): Promise<PaginatedResponse<any>> {
		const { barId, date, page = 1, limit = 20 } = filter;

		const where: any = {};
		if (barId) where.barId = barId;
		
		// Если передан date, используем его для точного дня (startOfDay <= createdAt < nextDay)
		if (date) {
			// Создаем дату с началом дня в UTC
			const dateObj = new Date(date + 'T00:00:00.000Z');
			const nextDay = new Date(dateObj);
			nextDay.setUTCDate(nextDay.getUTCDate() + 1);
			where.createdAt = {
				gte: dateObj,
				lt: nextDay, // Меньше следующего дня = точный день
			};
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
