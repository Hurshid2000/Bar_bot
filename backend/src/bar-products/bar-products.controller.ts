import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
	@ApiOperation({ summary: 'Добавить продукт в бар с ценой' })
	@ApiResponse({ status: 201, description: 'Продукт добавлен в бар' })
	@ApiResponse({ status: 404, description: 'Бар или продукт не найден' })
	@ApiResponse({ status: 409, description: 'Продукт уже добавлен в бар' })
	create(@Body() createBarProductDto: CreateBarProductDto) {
		return this.barProductsService.create(createBarProductDto);
	}

	@Post('bar/:barId/bulk')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Добавить несколько продуктов в бар' })
	@ApiResponse({ status: 201, description: 'Продукты добавлены в бар' })
	assignProductsToBar(
		@Param('barId') barId: string,
		@Body() products: { productId: string; price: number }[],
	) {
		return this.barProductsService.assignProductsToBar(barId, products);
	}

	@Get('bar/:barId')
	@ApiOperation({ summary: 'Получить все продукты бара с ценами' })
	@ApiResponse({ status: 200, description: 'Список продуктов бара' })
	findByBar(@Param('barId') barId: string) {
		return this.barProductsService.findByBar(barId);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить связь продукт-бар по ID' })
	findOne(@Param('id') id: string) {
		return this.barProductsService.findOne(id);
	}

	@Get('bar/:barId/product/:productId')
	@ApiOperation({ summary: 'Получить цену продукта в баре' })
	findByBarAndProduct(
		@Param('barId') barId: string,
		@Param('productId') productId: string,
	) {
		return this.barProductsService.findByBarAndProduct(barId, productId);
	}

	@Patch(':id')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Обновить цену продукта в баре' })
	update(
		@Param('id') id: string,
		@Body() updateBarProductDto: UpdateBarProductDto,
	) {
		return this.barProductsService.update(id, updateBarProductDto);
	}

	@Patch('bar/:barId/product/:productId')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Обновить цену продукта в баре по barId и productId' })
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
	@ApiOperation({ summary: 'Удалить продукт из бара' })
	remove(@Param('id') id: string) {
		return this.barProductsService.remove(id);
	}

	@Delete('bar/:barId/product/:productId')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Удалить продукт из бара по barId и productId' })
	removeByBarAndProduct(
		@Param('barId') barId: string,
		@Param('productId') productId: string,
	) {
		return this.barProductsService.removeByBarAndProduct(barId, productId);
	}
}
