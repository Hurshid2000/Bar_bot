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
	ForbiddenException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { CurrentUser } from '../guards/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@Controller('products')
@UseGuards(RolesGuard, BarAccessGuard)
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	@Post()
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	create(@Body() createProductDto: CreateProductDto) {
		return this.productsService.create(createProductDto);
	}

	@Get()
	findAll(@Query('barId') barId?: string, @CurrentUser() user?: any) {
		return this.productsService.findAll(barId, user?.role);
	}

	@Get('bar/:barId')
	findByBar(@Param('barId') barId: string, @CurrentUser() user?: any) {
		return this.productsService.findByBar(barId, user?.role);
	}

	@Get(':id')
	async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
		const product = await this.productsService.findOne(id, user?.role);
		
		// Проверяем доступ к бару продукта (если не ADMIN)
		if (user && user.role !== RoleType.ADMIN && product.bar) {
			const hasAccess = user.bars?.some(
				(userBar) => userBar.barId === product.bar.id,
			);
			if (!hasAccess) {
				throw new ForbiddenException('You do not have access to this bar');
			}
		}
		
		return product;
	}

	@Patch(':id')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
		return this.productsService.update(id, updateProductDto);
	}

	@Delete(':id')
	@Roles(RoleType.ADMIN)
	remove(@Param('id') id: string) {
		return this.productsService.remove(id);
	}
}
