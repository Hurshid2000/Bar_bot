import {
	Controller,
	Get,
	Post,
	Body,
	Query,
	UseGuards,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { RevenueFilterDto } from './dto/revenue-filter.dto';

@Controller('revenue')
@UseGuards(RolesGuard, BarAccessGuard)
export class RevenueController {
	constructor(private readonly revenueService: RevenueService) {}

	@Post()
	create(@Body() createRevenueDto: CreateRevenueDto) {
		return this.revenueService.create(createRevenueDto);
	}

	@Get()
	findAll(@Query() filter: RevenueFilterDto) {
		return this.revenueService.findAll(filter);
	}
}
