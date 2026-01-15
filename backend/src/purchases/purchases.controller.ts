import {
	Controller,
	Get,
	Post,
	Body,
	Query,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Controller('purchases')
export class PurchasesController {
	constructor(private readonly purchasesService: PurchasesService) {}

	@Post()
	create(@Body() createPurchaseDto: CreatePurchaseDto) {
		return this.purchasesService.create(createPurchaseDto);
	}

	@Get()
	findAll(@Query('barId') barId?: string) {
		return this.purchasesService.findAll(barId);
	}
}
