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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { RoleType, ProductType } from '@prisma/client';
import { SearchDto } from '../common/dto/search.dto';

@ApiTags('categories')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
@UseGuards(RolesGuard)
export class CategoriesController {
	constructor(private readonly categoriesService: CategoriesService) {}

	@Post()
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	@ApiOperation({ summary: 'Создать категорию' })
	create(@Body() createCategoryDto: CreateCategoryDto) {
		return this.categoriesService.create(createCategoryDto);
	}

	@Get()
	@ApiOperation({ summary: 'Получить все категории' })
	@ApiQuery({ name: 'type', required: false, enum: ProductType, description: 'Фильтр по типу' })
	findAll(@Query() search: SearchDto, @Query('type') type?: ProductType) {
		return this.categoriesService.findAll(search, type);
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.categoriesService.findOne(id);
	}

	@Patch(':id')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
		return this.categoriesService.update(id, updateCategoryDto);
	}

	@Delete(':id')
	@Roles(RoleType.ADMIN)
	remove(@Param('id') id: string) {
		return this.categoriesService.remove(id);
	}
}
