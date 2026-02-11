import {
	Controller,
	Get,
	Post,
	Body,
	Query,
	Param,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleFilterDto } from './dto/sale-filter.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { CurrentUser } from '../guards/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('sales')
@ApiBearerAuth('JWT-auth')
@Controller('sales')
@UseGuards(RolesGuard, BarAccessGuard)
export class SalesController {
	constructor(private readonly salesService: SalesService) {}

	@Post()
	@ApiOperation({ summary: 'Создать продажу (списывает со склада)' })
	create(@CurrentUser() user: User, @Body() dto: CreateSaleDto) {
		return this.salesService.create(user.id, dto);
	}

	@Get()
	@ApiOperation({ summary: 'Список продаж с фильтрацией' })
	findAll(@Query() filter: SaleFilterDto) {
		return this.salesService.findAll(filter);
	}

	@Get('summary')
	@ApiOperation({ summary: 'Итого продаж за период по бару' })
	getSummary(
		@Query('barId') barId: string,
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
	) {
		return this.salesService.getSalesSummary(barId, startDate, endDate);
	}

	@Get('daily')
	@ApiOperation({ summary: 'Продажи по дням за период' })
	getDailySales(
		@Query('barId') barId: string,
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
	) {
		return this.salesService.getDailySales(barId, startDate, endDate);
	}
}
