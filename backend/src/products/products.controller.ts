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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { CurrentUser } from '../guards/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';
import { ProductFilterDto } from '../common/dto/filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SearchDto } from '../common/dto/search.dto';

@ApiTags('products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
@UseGuards(RolesGuard)
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	@Post()
	@Roles(RoleType.ADMIN)
	@ApiOperation({ summary: 'Создать новый продукт (глобальный)' })
	@ApiResponse({ status: 201, description: 'Продукт создан' })
	@ApiResponse({ status: 400, description: 'Неверные данные' })
	@ApiResponse({ status: 404, description: 'Категория не найдена' })
	create(@Body() createProductDto: CreateProductDto) {
		return this.productsService.create(createProductDto);
	}

	@Get()
	@ApiOperation({ summary: 'Получить список продуктов с фильтрацией и пагинацией' })
	@ApiQuery({ name: 'barId', required: false, description: 'Фильтр по ID бара (показать только продукты доступные в баре)' })
	@ApiQuery({ name: 'categoryId', required: false, description: 'Фильтр по ID категории' })
	@ApiQuery({ name: 'type', required: false, description: 'Фильтр по типу продукта (PRODUCT, SPORT_PIT, FOOD)' })
	@ApiQuery({ name: 'search', required: false, description: 'Поиск по названию или штрих-коду' })
	@ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
	@ApiQuery({ name: 'limit', required: false, description: 'Количество элементов на странице' })
	@ApiResponse({ status: 200, description: 'Список продуктов' })
	findAll(
		@Query() filter: ProductFilterDto,
		@Query() pagination: PaginationDto,
		@Query() search: SearchDto,
		@CurrentUser() user?: any,
	) {
		return this.productsService.findAll(filter, pagination, user?.role, search);
	}

	@Get('bar/:barId')
	@ApiOperation({ summary: 'Получить продукты доступные в баре' })
	findByBar(
		@Param('barId') barId: string,
		@Query() pagination: PaginationDto,
		@CurrentUser() user?: any,
	) {
		return this.productsService.findByBar(barId, pagination, user?.role);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить продукт по ID' })
	@ApiQuery({ name: 'barId', required: false, description: 'ID бара для получения цены' })
	async findOne(
		@Param('id') id: string,
		@Query('barId') barId?: string,
		@CurrentUser() user?: any,
	) {
		return this.productsService.findOne(id, user?.role, barId);
	}

	@Patch(':id')
	@Roles(RoleType.ADMIN)
	@ApiOperation({ summary: 'Обновить продукт' })
	update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
		return this.productsService.update(id, updateProductDto);
	}

	@Delete(':id')
	@Roles(RoleType.ADMIN)
	@ApiOperation({ summary: 'Удалить продукт' })
	remove(@Param('id') id: string) {
		return this.productsService.remove(id);
	}
}
