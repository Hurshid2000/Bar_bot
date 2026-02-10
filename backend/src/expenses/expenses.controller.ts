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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { RoleType } from '@prisma/client';
import { ExpenseFilterDto } from './dto/expense-filter.dto';

@ApiTags('expenses')
@ApiBearerAuth('JWT-auth')
@Controller('expenses')
@UseGuards(RolesGuard, BarAccessGuard)
export class ExpensesController {
	constructor(private readonly expensesService: ExpensesService) {}

	@Post()
	@ApiOperation({ summary: 'Создать расход (с указанием даты)' })
	create(@Body() createExpenseDto: CreateExpenseDto) {
		return this.expensesService.create(createExpenseDto);
	}

	@Get()
	@ApiOperation({ summary: 'Получить список расходов с фильтрацией' })
	findAll(@Query() filter: ExpenseFilterDto) {
		return this.expensesService.findAll(filter);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить расход по ID' })
	findOne(@Param('id') id: string) {
		return this.expensesService.findOne(id);
	}

	@Patch(':id')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Обновить расход (сумма, описание, дата)' })
	update(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto) {
		return this.expensesService.update(id, updateExpenseDto);
	}

	@Delete(':id')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Удалить расход' })
	remove(@Param('id') id: string) {
		return this.expensesService.remove(id);
	}
}
