import {
	Controller,
	Get,
	Post,
	Patch,
	Param,
	Body,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RevenueService } from './revenue.service';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { RevenueFilterDto } from './dto/revenue-filter.dto';
import { CurrentUser } from '../guards/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('revenue')
@ApiBearerAuth('JWT-auth')
@Controller('revenue')
@UseGuards(RolesGuard, BarAccessGuard)
export class RevenueController {
	constructor(private readonly revenueService: RevenueService) {}

	@Post()
	@ApiOperation({ summary: 'Создать или обновить выручку (upsert по barId+date)' })
	create(@CurrentUser() user: User, @Body() createRevenueDto: CreateRevenueDto) {
		return this.revenueService.create(createRevenueDto, user.id);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Обновить выручку по ID (только автор или ADMIN)' })
	update(
		@Param('id') id: string,
		@CurrentUser() user: User,
		@Body() updateRevenueDto: UpdateRevenueDto,
	) {
		return this.revenueService.update(id, updateRevenueDto, user.id, user.role);
	}

	@Get()
	@ApiOperation({ summary: 'Получить список выручки с фильтрами' })
	findAll(@Query() filter: RevenueFilterDto) {
		return this.revenueService.findAll(filter);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить запись выручки по ID' })
	findOne(@Param('id') id: string) {
		return this.revenueService.findOne(id);
	}
}
