import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { RoleType } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	@Post()
	@ApiOperation({ summary: 'Создать заказ' })
	create(@CurrentUser() user: User, @Body() createOrderDto: CreateOrderDto) {
		return this.ordersService.create(user.id, createOrderDto);
	}

	@Get()
	@ApiOperation({ summary: 'Получить список заказов' })
	findAll(
		@CurrentUser() user: User,
		@Query() filter: OrderFilterDto,
	) {
		return this.ordersService.findAll(user.id, user.role, filter);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить заказ по ID' })
	@ApiParam({ name: 'id', description: 'ID заказа' })
	findOne(
		@Param('id') id: string,
		@CurrentUser() user: User,
	) {
		return this.ordersService.findOne(id, user.id, user.role);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Обновить заказ' })
	@ApiParam({ name: 'id', description: 'ID заказа' })
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	update(
		@Param('id') id: string,
		@CurrentUser() user: User,
		@Body() updateOrderDto: UpdateOrderDto,
	) {
		return this.ordersService.update(id, user.id, user.role, updateOrderDto);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Удалить заказ' })
	@ApiParam({ name: 'id', description: 'ID заказа' })
	@Roles(RoleType.ADMIN)
	remove(
		@Param('id') id: string,
		@CurrentUser() user: User,
	) {
		return this.ordersService.remove(id, user.id, user.role);
	}
}
