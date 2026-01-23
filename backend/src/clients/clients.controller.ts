import {
	Controller,
	Get,
	Post,
	Patch,
	Body,
	Param,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/decorators/current-user.decorator';

@ApiTags('Clients')
@Controller('clients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientsController {
	constructor(private readonly clientsService: ClientsService) {}

	@Post()
	@ApiOperation({ summary: 'Создать клиента' })
	create(@CurrentUser() user: any, @Body() createClientDto: CreateClientDto) {
		return this.clientsService.create(user.id, createClientDto);
	}

	@Get()
	@ApiOperation({ summary: 'Получить список клиентов' })
	findAll(
		@CurrentUser() user: any,
		@Query() filter: ClientFilterDto,
	) {
		return this.clientsService.findAll(user.id, user.role, filter);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить клиента по ID' })
	findOne(
		@CurrentUser() user: any,
		@Param('id') id: string,
	) {
		return this.clientsService.findOne(id, user.id, user.role);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Обновить клиента' })
	update(
		@CurrentUser() user: any,
		@Param('id') id: string,
		@Body() updateClientDto: UpdateClientDto,
	) {
		return this.clientsService.update(id, user.id, user.role, updateClientDto);
	}

	@Post(':id/transactions')
	@ApiOperation({ summary: 'Создать операцию с клиентом (депозит, долг, платеж)' })
	createTransaction(
		@CurrentUser() user: any,
		@Param('id') clientId: string,
		@Body() createTransactionDto: Omit<CreateTransactionDto, 'clientId'>,
	) {
		return this.clientsService.createTransaction(user.id, {
			...createTransactionDto,
			clientId,
		});
	}

	@Get(':id/transactions')
	@ApiOperation({ summary: 'Получить историю операций клиента' })
	getTransactions(
		@CurrentUser() user: any,
		@Param('id') id: string,
	) {
		return this.clientsService.getTransactions(id, user.id, user.role);
	}

	@Get(':id/edit-logs')
	@ApiOperation({ summary: 'Получить историю изменений клиента' })
	getEditLogs(
		@CurrentUser() user: any,
		@Param('id') id: string,
	) {
		return this.clientsService.getEditLogs(id, user.id, user.role);
	}

	@Get('statistics/:barId')
	@ApiOperation({ summary: 'Получить статистику по клиентам бара' })
	getStatistics(
		@CurrentUser() user: any,
		@Param('barId') barId: string,
	) {
		return this.clientsService.getStatistics(barId, user.id, user.role);
	}
}
