import {
	Controller,
	Get,
	Query,
	Param,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { StockFilterDto } from './dto/stock-filter.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';

@ApiTags('stock')
@ApiBearerAuth('JWT-auth')
@Controller('stock')
@UseGuards(RolesGuard, BarAccessGuard)
export class StockController {
	constructor(private readonly stockService: StockService) {}

	@Get()
	@ApiOperation({ summary: 'Получить остатки по бару' })
	getByBar(@Query() filter: StockFilterDto) {
		return this.stockService.getByBar(filter.barId, filter.productType);
	}

	@Get('map/:barId')
	@ApiOperation({ summary: 'Получить карту остатков для бара (productId -> quantity)' })
	async getStockMap(@Param('barId') barId: string, @Query('productIds') productIds?: string) {
		const ids = productIds ? productIds.split(',') : [];
		if (ids.length === 0) {
			// Все остатки бара
			const stocks = await this.stockService.getByBar(barId);
			const map: Record<string, number> = {};
			for (const s of stocks) {
				map[s.productId] = s.quantity;
			}
			return map;
		}
		return this.stockService.getStockMap(barId, ids);
	}
}
