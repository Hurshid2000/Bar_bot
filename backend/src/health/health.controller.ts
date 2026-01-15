import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../guards/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
	constructor(private prisma: PrismaService) {}

	@Public()
	@Get()
	@ApiOperation({ summary: 'Проверка здоровья сервиса и подключения к БД' })
	@ApiResponse({
		status: 200,
		description: 'Сервис работает',
		schema: {
			example: {
				status: 'ok',
				timestamp: '2024-01-15T10:30:00.000Z',
				database: 'connected',
			},
		},
	})
	async check() {
		try {
			// Проверяем подключение к базе данных
			await this.prisma.$queryRaw`SELECT 1`;
			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
				database: 'connected',
			};
		} catch (error) {
			return {
				status: 'error',
				timestamp: new Date().toISOString(),
				database: 'disconnected',
				error: error.message,
			};
		}
	}
}
