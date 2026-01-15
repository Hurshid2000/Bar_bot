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
import { BarsService } from './bars.service';
import { CreateBarDto } from './dto/create-bar.dto';
import { UpdateBarDto } from './dto/update-bar.dto';
import { RolesGuard } from '../guards/roles.guard';
import { BarAccessGuard } from '../guards/bar-access.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { CurrentUser } from '../guards/decorators/current-user.decorator';
import { RoleType } from '@prisma/client';

@Controller('bars')
@UseGuards(RolesGuard, BarAccessGuard)
export class BarsController {
	constructor(private readonly barsService: BarsService) {}

	@Post()
	@Roles(RoleType.ADMIN, RoleType.MANAGER)
	create(@Body() createBarDto: CreateBarDto) {
		return this.barsService.create(createBarDto);
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
