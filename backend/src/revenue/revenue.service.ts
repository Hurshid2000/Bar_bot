import {
	Injectable,
	BadRequestException,
	NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { RevenueFilterDto } from '../common/dto/filter.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';
import {
	createPaginatedResponse,
	getSkip,
} from '../common/utils/pagination.util';

@Injectable()
export class RevenueService {
	constructor(private prisma: PrismaService) {}

	async create(createRevenueDto: CreateRevenueDto) {
		const { barId, date, cash, card } = createRevenueDto;

		// Проверяем существование бара
		const bar = await this.prisma.bar.findUnique({
			where: { id: barId },
		});
		if (!bar) {
			throw new NotFoundException(`Bar with ID ${barId} not found`);
		}

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
				`Revenue record already exists for bar ${bar.name} on date ${new Date(date).toISOString().split('T')[0]}`,
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

	async findAll(
		filter: RevenueFilterDto,
		pagination: PaginationDto,
	): Promise<PaginatedResponse<any>> {
		const { barId, startDate, endDate } = filter;
		const { page = 1, limit = 20 } = pagination;

		const where: any = {};
		if (barId) where.barId = barId;
		if (startDate || endDate) {
			where.date = {};
			if (startDate) where.date.gte = new Date(startDate);
			if (endDate) where.date.lte = new Date(endDate);
		}

		const [revenues, total] = await Promise.all([
			this.prisma.revenue.findMany({
				where,
				orderBy: {
					date: 'desc',
				},
				skip: getSkip(page, limit),
				take: limit,
			}),
			this.prisma.revenue.count({ where }),
		]);

		return createPaginatedResponse(revenues, total, page, limit);
	}
}
