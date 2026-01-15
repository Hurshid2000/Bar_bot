import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
	constructor(private prisma: PrismaService) {}

	async create(createExpenseDto: CreateExpenseDto) {
		return this.prisma.expense.create({
			data: createExpenseDto,
		});
	}

	async findAll(barId?: string) {
		const where = barId ? { barId } : {};

		return this.prisma.expense.findMany({
			where,
			orderBy: {
				createdAt: 'desc',
			},
		});
	}
}
