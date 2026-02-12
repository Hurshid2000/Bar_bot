import {
	Controller,
	Get,
	Post,
	Patch,
	Param,
	Body,
	Query,
	UseGuards,
	UseInterceptors,
	UploadedFile,
	BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
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

	@Post('import-card-excel')
	@UseInterceptors(
		FileInterceptor('file', {
			storage: multer.memoryStorage(),
			limits: { fileSize: 5 * 1024 * 1024 },
		}),
	)
	@ApiOperation({ summary: 'Импорт поступлений на карту из Excel (строки «Итого за … Поступление»)' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				file: { type: 'string', format: 'binary' },
				barId: { type: 'string' },
			},
			required: ['file', 'barId'],
		},
	})
	async importCardExcel(
		@CurrentUser() user: User,
		@UploadedFile() file: { buffer?: Buffer },
		@Body('barId') barId: string,
	) {
		if (!file?.buffer) {
			throw new BadRequestException('Файл не загружен');
		}
		if (!barId) {
			throw new BadRequestException('Укажите barId');
		}
		return this.revenueService.importCardFromExcel(file.buffer, barId, user.id);
	}

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
