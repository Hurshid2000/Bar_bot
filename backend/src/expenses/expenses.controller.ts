import {
	Controller,
	Get,
	Post,
	Body,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { ExpenseFilterDto } from '../common/dto/filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('expenses')
@UseGuards(RolesGuard, BarAccessGuard)
export class ExpensesController {
	constructor(private readonly expensesService: ExpensesService) {}

	@Post()
	create(@Body() createExpenseDto: CreateExpenseDto) {
		return this.expensesService.create(createExpenseDto);
	}

	@Get()
	findAll(
		@Query() filter: ExpenseFilterDto,
		@Query() pagination: PaginationDto,
	) {
		return this.expensesService.findAll(filter, pagination);
	}
}
