import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
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
		const { barId, amount, description, date } = createExpenseDto;

		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

		return this.prisma.expense.create({
			data: {
				barId,
				amount,
				description,
				date: date ? new Date(date + 'T00:00:00.000Z') : new Date(),
			},
		});
	}

	async findOne(id: string) {
		const expense = await this.prisma.expense.findUnique({
			where: { id },
		});
		if (!expense) {
			throw new NotFoundException(`Expense with ID ${id} not found`);
		}
		return expense;
	}

	async update(id: string, updateExpenseDto: UpdateExpenseDto) {
		await this.findOne(id);

		const data: any = {};
		if (updateExpenseDto.amount !== undefined) data.amount = updateExpenseDto.amount;
		if (updateExpenseDto.description !== undefined) data.description = updateExpenseDto.description;
		if (updateExpenseDto.date) data.date = new Date(updateExpenseDto.date + 'T00:00:00.000Z');

		return this.prisma.expense.update({
			where: { id },
			data,
		});
	}

	async remove(id: string) {
		await this.findOne(id);
		return this.prisma.expense.delete({
			where: { id },
		});
	}

	async findAll(
		filter: ExpenseFilterDto,
	): Promise<PaginatedResponse<any>> {
		const { barId, date, startDate, endDate, page = 1, limit = 20 } = filter;

		const where: any = {};
		if (barId) where.barId = barId;
		
		// Фильтрация по полю date (не createdAt)
		if (date) {
			const dateObj = new Date(date + 'T00:00:00.000Z');
			const nextDay = new Date(dateObj);
			nextDay.setUTCDate(nextDay.getUTCDate() + 1);
			where.date = {
				gte: dateObj,
				lt: nextDay,
			};
		} else if (startDate || endDate) {
			where.date = {};
			if (startDate) {
				const startDateObj = new Date(startDate + 'T00:00:00.000Z');
				where.date.gte = startDateObj;
			}
			if (endDate) {
				const endDateObj = new Date(endDate + 'T00:00:00.000Z');
				const nextDay = new Date(endDateObj);
				nextDay.setUTCDate(nextDay.getUTCDate() + 1);
				where.date.lt = nextDay;
			}
		}

		const [expenses, total] = await Promise.all([
			this.prisma.expense.findMany({
				where,
				orderBy: {
					date: 'desc',
				},
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.expense.count({ where }),
		]);

		return createPaginatedResponse(expenses, total, page, limit);
	}
}
