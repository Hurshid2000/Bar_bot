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

	@Get('bars/:barId/inventories')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Получить список инвентаризаций для бара' })
	@ApiParam({ name: 'barId', description: 'ID бара' })
	@ApiResponse({ status: 200, description: 'Список инвентаризаций' })
	getInventories(@Param('barId') barId: string) {
		return this.reportsService.getInventories(barId);
	}

	@Get('bars/:barId/cash-audit')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Отчет проверки кассы (между двумя инвентаризациями)' })
	@ApiParam({ name: 'barId', description: 'ID бара' })
	@ApiQuery({ name: 'startInventoryId', description: 'ID начальной инвентаризации' })
	@ApiQuery({ name: 'endInventoryId', description: 'ID конечной инвентаризации' })
	@ApiResponse({ status: 200, description: 'Отчет проверки кассы' })
	getCashAuditReport(
		@Param('barId') barId: string,
		@Query('startInventoryId') startInventoryId: string,
		@Query('endInventoryId') endInventoryId: string,
	) {
		if (!startInventoryId || !endInventoryId) {
			throw new BadRequestException(
				'startInventoryId and endInventoryId parameters are required',
			);
		}
		return this.reportsService.getCashAuditReport(
			barId,
			startInventoryId,
			endInventoryId,
		);
	}

	@Get('bars/:barId/profit')
	@Roles(RoleType.ADMIN)
	@ApiOperation({ summary: 'Отчет прибыли (между двумя инвентаризациями, только для ADMIN)' })
	@ApiParam({ name: 'barId', description: 'ID бара' })
	@ApiQuery({ name: 'startInventoryId', description: 'ID начальной инвентаризации' })
	@ApiQuery({ name: 'endInventoryId', description: 'ID конечной инвентаризации' })
	@ApiResponse({ status: 200, description: 'Отчет прибыли' })
	getProfitReport(
		@Param('barId') barId: string,
		@Query('startInventoryId') startInventoryId: string,
		@Query('endInventoryId') endInventoryId: string,
	) {
		if (!startInventoryId || !endInventoryId) {
			throw new BadRequestException(
				'startInventoryId and endInventoryId parameters are required',
			);
		}
		return this.reportsService.getProfitReport(
			barId,
			startInventoryId,
			endInventoryId,
		);
	}

	@Get('bars/:barId/profit/compare-periods')
	@Roles(RoleType.ADMIN)
	@ApiOperation({
		summary:
			'Сравнение прибыли между двумя периодами для одного бара (только для ADMIN)',
	})
	@ApiParam({ name: 'barId', description: 'ID бара' })
	@ApiQuery({ name: 'firstStartInventoryId', description: 'ID начальной инвентаризации первого периода' })
	@ApiQuery({ name: 'firstEndInventoryId', description: 'ID конечной инвентаризации первого периода' })
	@ApiQuery({ name: 'secondStartInventoryId', description: 'ID начальной инвентаризации второго периода' })
	@ApiQuery({ name: 'secondEndInventoryId', description: 'ID конечной инвентаризации второго периода' })
	@ApiResponse({ status: 200, description: 'Сравнение прибыли между периодами' })
	compareProfitPeriods(
		@Param('barId') barId: string,
		@Query('firstStartInventoryId') firstStartInventoryId: string,
		@Query('firstEndInventoryId') firstEndInventoryId: string,
		@Query('secondStartInventoryId') secondStartInventoryId: string,
		@Query('secondEndInventoryId') secondEndInventoryId: string,
	) {
		if (
			!firstStartInventoryId ||
			!firstEndInventoryId ||
			!secondStartInventoryId ||
			!secondEndInventoryId
		) {
			throw new BadRequestException(
				'All inventory ID parameters are required',
			);
		}
		return this.reportsService.compareProfitPeriods(
			barId,
			firstStartInventoryId,
			firstEndInventoryId,
			secondStartInventoryId,
			secondEndInventoryId,
		);
	}

	@Get('profit/compare-bars')
	@Roles(RoleType.ADMIN)
	@ApiOperation({
		summary: 'Сравнение прибыли между барами за один период (только для ADMIN)',
	})
	@ApiQuery({ name: 'barIds', description: 'Список ID баров через запятую', example: 'id1,id2,id3' })
	@ApiQuery({ name: 'startInventoryId', description: 'ID начальной инвентаризации' })
	@ApiQuery({ name: 'endInventoryId', description: 'ID конечной инвентаризации' })
	@ApiResponse({ status: 200, description: 'Сравнение прибыли между барами' })
	compareProfitBars(
		@Query('barIds') barIds: string,
		@Query('startInventoryId') startInventoryId: string,
		@Query('endInventoryId') endInventoryId: string,
	) {
		if (!barIds || !startInventoryId || !endInventoryId) {
			throw new BadRequestException(
				'barIds, startInventoryId and endInventoryId parameters are required',
			);
		}
		const barIdsArray = barIds.split(',').map((id) => id.trim());
		return this.reportsService.compareProfitBars(
			barIdsArray,
			startInventoryId,
			endInventoryId,
		);
	}
}
