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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BarProductsService } from './bar-products.service';
import { CreateBarProductDto } from './dto/create-bar-product.dto';
import { UpdateBarProductDto } from './dto/update-bar-product.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('bar-products')
@ApiBearerAuth('JWT-auth')
@Controller('bar-products')
@UseGuards(RolesGuard, BarAccessGuard)
export class BarProductsController {
	constructor(private readonly barProductsService: BarProductsService) {}

	@Post()
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Добавить продукт в бар (создание или реактивация)' })
	@ApiResponse({ status: 201, description: 'Продукт добавлен в бар' })
	@ApiResponse({ status: 404, description: 'Бар или продукт не найден' })
	@ApiResponse({ status: 409, description: 'Продукт уже активен в баре' })
	create(@Body() createBarProductDto: CreateBarProductDto) {
		return this.barProductsService.create(createBarProductDto);
	}

	@Post('bar/:barId/bulk')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Добавить несколько продуктов в бар (с реактивацией)' })
	@ApiResponse({ status: 201, description: 'Продукты добавлены в бар' })
	assignProductsToBar(
		@Param('barId') barId: string,
		@Body() products: { productId: string; price?: number }[],
	) {
		return this.barProductsService.assignProductsToBar(barId, products);
	}

	@Get('bar/:barId')
	@ApiOperation({ summary: 'Получить товары бара (по умолчанию только активные)' })
	@ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Включить неактивные товары' })
	@ApiResponse({ status: 200, description: 'Список товаров бара' })
	findByBar(
		@Param('barId') barId: string,
		@Query('includeInactive') includeInactive?: string,
	) {
		return this.barProductsService.findByBar(barId, includeInactive === 'true');
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить связь продукт-бар по ID' })
	findOne(@Param('id') id: string) {
		return this.barProductsService.findOne(id);
	}

	@Get('bar/:barId/product/:productId')
	@ApiOperation({ summary: 'Получить данные продукта в баре' })
	findByBarAndProduct(
		@Param('barId') barId: string,
		@Param('productId') productId: string,
	) {
		return this.barProductsService.findByBarAndProduct(barId, productId);
	}

	@Patch(':id')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Обновить цену/isActive продукта в баре' })
	update(
		@Param('id') id: string,
		@Body() updateBarProductDto: UpdateBarProductDto,
	) {
		return this.barProductsService.update(id, updateBarProductDto);
	}

	@Patch('bar/:barId/product/:productId')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Обновить цену/isActive продукта в баре по barId и productId' })
	updateByBarAndProduct(
		@Param('barId') barId: string,
		@Param('productId') productId: string,
		@Body() updateBarProductDto: UpdateBarProductDto,
	) {
		return this.barProductsService.updateByBarAndProduct(
			barId,
			productId,
			updateBarProductDto,
		);
	}

	@Delete(':id')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Деактивировать продукт в баре (мягкое удаление)' })
	remove(@Param('id') id: string) {
		return this.barProductsService.deactivate(id);
	}

	@Delete('bar/:barId/product/:productId')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Деактивировать продукт в баре по barId и productId (мягкое удаление)' })
	removeByBarAndProduct(
		@Param('barId') barId: string,
		@Param('productId') productId: string,
	) {
		return this.barProductsService.deactivateByBarAndProduct(barId, productId);
	}
}
