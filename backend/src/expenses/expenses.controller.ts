import {
	Controller,
	Get,
	Post,
	Body,
	Query,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Controller('expenses')
export class ExpensesController {
	constructor(private readonly expensesService: ExpensesService) {}

	@Post()
	create(@Body() createExpenseDto: CreateExpenseDto) {
		return this.expensesService.create(createExpenseDto);
	}

	@Get()
	findAll(@Query('barId') barId?: string) {
		return this.expensesService.findAll(barId);
	}
}
