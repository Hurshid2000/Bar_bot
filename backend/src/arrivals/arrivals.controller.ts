import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ArrivalsService } from './arrivals.service';
import { CreateArrivalDto } from './dto/create-arrival.dto';
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

	@Get(':id')
	@ApiOperation({ summary: 'Получить приход/списание по ID' })
	@ApiParam({ name: 'id', description: 'ID прихода/списания' })
	findOne(
		@Param('id') id: string,
		@CurrentUser() user: User,
	) {
		return this.arrivalsService.findOne(id, user.id, user.role);
	}
}
