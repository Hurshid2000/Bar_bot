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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ArrivalsService } from './arrivals.service';
import { CreateArrivalDto } from './dto/create-arrival.dto';
import { UpdateArrivalDto } from './dto/update-arrival.dto';
import { ArrivalFilterDto } from './dto/arrival-filter.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CurrentUser } from '../guards/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('arrivals')
@ApiBearerAuth('JWT-auth')
@Controller('arrivals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArrivalsController {
	constructor(private readonly arrivalsService: ArrivalsService) {}

	@Post()
	@ApiOperation({ summary: 'Создать приход/списание' })
	create(@CurrentUser() user: User, @Body() createArrivalDto: CreateArrivalDto) {
		return this.arrivalsService.create(user.id, createArrivalDto);
	}

	@Get()
	@ApiOperation({ summary: 'Получить список приходов/списаний' })
	findAll(
		@CurrentUser() user: User,
		@Query() filter: ArrivalFilterDto,
	) {
		return this.arrivalsService.findAll(user.id, user.role, filter);
	}

	@Get('summary')
	@ApiOperation({ summary: 'Сводка приходов/списаний за период с группировкой по товарам' })
	getSummary(
		@CurrentUser() user: User,
		@Query() filter: ArrivalFilterDto,
	) {
		return this.arrivalsService.getSummary(user.id, user.role, filter);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Получить приход/списание по ID' })
	@ApiParam({ name: 'id', description: 'ID прихода/списания' })
	findOne(
		@Param('id') id: string,
		@CurrentUser() user: User,
	) {
		return this.arrivalsService.findOne(id, user.id, user.role);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Изменить приход/списание (корректирует склад)' })
	update(
		@Param('id') id: string,
		@CurrentUser() user: User,
		@Body() dto: UpdateArrivalDto,
	) {
		return this.arrivalsService.update(id, user.id, user.role, dto);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Удалить приход/списание (откатывает склад)' })
	remove(
		@Param('id') id: string,
		@CurrentUser() user: User,
	) {
		return this.arrivalsService.remove(id, user.id, user.role);
	}
}
