import {
	Controller,
	Get,
	Query,
	UseGuards,
	Param,
	BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { RoleType } from '@prisma/client';
import { CompareBarsDto } from './dto/report-period.dto';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(RolesGuard, BarAccessGuard)
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	@Get('bars/:barId/daily')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Получить дневной отчет по бару' })
	@ApiParam({ name: 'barId', description: 'ID бара' })
	@ApiQuery({ name: 'date', description: 'Дата в формате YYYY-MM-DD', example: '2024-01-15' })
	@ApiResponse({ status: 200, description: 'Дневной отчет' })
	getDailyReport(
		@Param('barId') barId: string,
		@Query('date') date: string,
	) {
		if (!date) {
			throw new BadRequestException('Date parameter is required');
		}
		return this.reportsService.getDailyReport(barId, date);
	}

	@Get('bars/:barId/monthly')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	getMonthlyReport(
		@Param('barId') barId: string,
		@Query('month') month: string,
	) {
		if (!month) {
			throw new BadRequestException('Month parameter is required (format: YYYY-MM)');
		}
		return this.reportsService.getMonthlyReport(barId, month);
	}

	@Get('bars/:barId/period')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	getPeriodReport(
		@Param('barId') barId: string,
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
	) {
		if (!startDate || !endDate) {
			throw new BadRequestException('startDate and endDate parameters are required');
		}
		return this.reportsService.getPeriodReport(barId, startDate, endDate);
	}

	@Get('bars/:barId/top-products')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	getTopProducts(
		@Param('barId') barId: string,
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
		@Query('limit') limit?: string,
	) {
		if (!startDate || !endDate) {
			throw new BadRequestException('startDate and endDate parameters are required');
		}
		return this.reportsService.getTopProducts(
			barId,
			new Date(startDate),
			new Date(endDate),
			limit ? parseInt(limit, 10) : 10,
		);
	}

	@Get('bars/:barId/product-type-stats')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	getProductTypeStats(
		@Param('barId') barId: string,
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
	) {
		if (!startDate || !endDate) {
			throw new BadRequestException('startDate and endDate parameters are required');
		}
		return this.reportsService.getProductTypeStats(
			barId,
			new Date(startDate),
			new Date(endDate),
		);
	}

	@Get('compare')
	@Roles(RoleType.ADMIN)
	@ApiOperation({ summary: 'Сравнить несколько баров (только для ADMIN)' })
	@ApiQuery({ name: 'barIds', description: 'Список ID баров через запятую', example: 'id1,id2,id3' })
	@ApiQuery({ name: 'startDate', description: 'Начальная дата (YYYY-MM-DD)', example: '2024-01-01' })
	@ApiQuery({ name: 'endDate', description: 'Конечная дата (YYYY-MM-DD)', example: '2024-01-31' })
	@ApiResponse({ status: 200, description: 'Сравнение баров' })
	compareBars(
		@Query('barIds') barIds: string,
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
	) {
		if (!barIds || !startDate || !endDate) {
			throw new BadRequestException('barIds, startDate and endDate parameters are required');
		}
		const barIdsArray = barIds.split(',').map((id) => id.trim());
		return this.reportsService.compareBars({
			barIds: barIdsArray,
			startDate,
			endDate,
		});
	}
}
