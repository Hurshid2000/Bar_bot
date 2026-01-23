import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoriesService } from './inventories.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryFilterDto } from './dto/inventory-filter.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/decorators/current-user.decorator';

@ApiTags('Inventories')
@Controller('inventories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoriesController {
	constructor(private readonly inventoriesService: InventoriesService) {}

	@Post()
	@ApiOperation({ summary: 'Создать инвентаризацию' })
	create(@CurrentUser() user: any, @Body() createInventoryDto: CreateInventoryDto) {
		return this.inventoriesService.create(user.id, createInventoryDto);
	}

	@Get()
	@ApiOperation({ summary: 'Получить список инвентаризаций' })
	findAll(
		@CurrentUser() user: any,
		@Query() filter: InventoryFilterDto,
	) {
		return this.inventoriesService.findAll(user.id, user.role, filter);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить инвентаризацию по ID' })
	findOne(
		@CurrentUser() user: any,
		@Param('id') id: string,
	) {
		return this.inventoriesService.findOne(id, user.id, user.role);
	}

	@Get(':id/compare')
	@ApiOperation({ summary: 'Сравнить инвентаризацию с предыдущей' })
	compareWithPrevious(
		@CurrentUser() user: any,
		@Param('id') id: string,
	) {
		return this.inventoriesService.compareWithPrevious(id, user.id, user.role);
	}
}
