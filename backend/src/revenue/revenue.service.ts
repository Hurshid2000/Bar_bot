import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';

@Injectable()
export class RevenueService {
	constructor(private prisma: PrismaService) {}

	async create(createRevenueDto: CreateRevenueDto) {
		const { barId, date, cash, card } = createRevenueDto;

		const existingRevenue = await this.prisma.revenue.findUnique({
			where: {
				barId_date: {
					barId,
					date: new Date(date),
				},
			},
		});

		if (existingRevenue) {
			throw new BadRequestException(
				'Revenue record already exists for this bar and date',
			);
		}

		return this.prisma.revenue.create({
			data: {
				barId,
				date: new Date(date),
				cash,
				card,
			},
		});
	}

	async findAll(barId?: string) {
		const where = barId ? { barId } : {};

		return this.prisma.revenue.findMany({
			where,
			orderBy: {
				date: 'desc',
			},
		});
	}
}
