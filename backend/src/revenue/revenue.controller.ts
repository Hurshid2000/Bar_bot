import {
	Controller,
	Get,
	Post,
	Body,
	Query,
	ValidationPipe,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';

@Controller('revenue')
export class RevenueController {
	constructor(private readonly revenueService: RevenueService) {}

	@Post()
	create(@Body(ValidationPipe) createRevenueDto: CreateRevenueDto) {
		return this.revenueService.create(createRevenueDto);
	}

	@Get()
	findAll(@Query('barId') barId?: string) {
		return this.revenueService.findAll(barId);
	}
}
