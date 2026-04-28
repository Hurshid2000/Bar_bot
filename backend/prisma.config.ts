import { config } from 'dotenv';
import { existsSync } from 'fs';
import { defineConfig } from 'prisma/config';

// Локально подгружаем .env (если есть). На Railway/проде env-переменные
// инжектятся платформой напрямую — файла .env нет.
// На этапе билда (Docker build) DATABASE_URL может отсутствовать —
// это ок для `prisma generate`, поэтому НЕ бросаем ошибку.
if (existsSync('.env')) {
	config({ path: '.env' });
}

export default defineConfig({
	migrations: {
		path: 'prisma/migrations',
		seed: 'npx ts-node prisma/seed.ts',
	},
	datasource: {
		// Если DATABASE_URL не задан (например, во время docker build) —
		// подставляем плейсхолдер, чтобы prisma generate не падал.
		// На рантайме (migrate deploy / приложение) URL ОБЯЗАТЕЛЕН — иначе будет ясная ошибка.
		url: process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
	},
})
