import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	constructor(private configService: ConfigService) {
		// Получаем DATABASE_URL из ConfigService
		const databaseUrl = configService.get<string>('DATABASE_URL');
		
		if (!databaseUrl) {
			throw new Error('DATABASE_URL is not defined. Please check your .env file.');
		}

		// Создаем Pool для PostgreSQL
		const pool = new Pool({ connectionString: databaseUrl });
		
		// Создаем adapter для Prisma 7 (передаем Pool напрямую)
		const adapter = new PrismaPg(pool);
		
		// Передаем adapter в PrismaClient
		super({ adapter });
	}

	async onModuleInit() {
		await this.$connect();
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}
}
