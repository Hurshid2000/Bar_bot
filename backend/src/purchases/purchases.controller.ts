import {
	Controller,
	Get,
	Post,
	Patch,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { PurchaseFilterDto } from '../common/dto/filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('purchases')
@UseGuards(RolesGuard, BarAccessGuard)
export class PurchasesController {
	constructor(private readonly purchasesService: PurchasesService) {}

	@Post()
	create(@Body() createPurchaseDto: CreatePurchaseDto) {
		return this.purchasesService.create(createPurchaseDto);
	}

	@Get()
	findAll(
		@Query() filter: PurchaseFilterDto,
		@Query() pagination: PaginationDto,
	) {
		return this.purchasesService.findAll(filter, pagination);
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.purchasesService.findOne(id);
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
		return this.purchasesService.update(id, dto);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.purchasesService.remove(id);
	}
}
