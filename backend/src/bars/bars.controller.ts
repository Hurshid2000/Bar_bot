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
import { BarsService } from './bars.service';
import { CreateBarDto } from './dto/create-bar.dto';
import { UpdateBarDto } from './dto/update-bar.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { CurrentUser } from '../guards/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@ApiTags('bars')
@ApiBearerAuth('JWT-auth')
@Controller('bars')
@UseGuards(RolesGuard, BarAccessGuard)
export class BarsController {
	constructor(private readonly barsService: BarsService) {}

	@Post()
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	create(@Body() createBarDto: CreateBarDto) {
		return this.barsService.create(createBarDto);
	}

	@Get('monthly-stats')
	@ApiOperation({ summary: 'Получить месячную статистику всех баров (касса, расходы)' })
	@ApiQuery({ name: 'startDate', required: true, description: 'Начало периода (yyyy-MM-dd)' })
	@ApiQuery({ name: 'endDate', required: true, description: 'Конец периода (yyyy-MM-dd)' })
	getMonthlyStats(
		@Query('startDate') startDate: string,
		@Query('endDate') endDate: string,
	) {
		return this.barsService.getMonthlyStats(startDate, endDate);
	}

	@Get()
	findAll() {
		return this.barsService.findAll();
	}

	@Get(':barId')
	findOne(@Param('barId') barId: string, @CurrentUser() user: any) {
		return this.barsService.findOne(barId);
	}

	@Patch(':barId')
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	update(
		@Param('barId') barId: string,
		@Body() updateBarDto: UpdateBarDto,
	) {
		return this.barsService.update(barId, updateBarDto);
	}

	@Delete(':barId')
	@Roles(RoleType.ADMIN)
	remove(@Param('barId') barId: string) {
		return this.barsService.remove(barId);
	}
}
