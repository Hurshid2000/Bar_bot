import { config } from 'dotenv';
import { existsSync } from 'fs';
import { defineConfig } from 'prisma/config';

// Локально подгружаем .env (если есть). На Railway/проде env-переменные
// инжектятся платформой напрямую, файла .env нет.
if (existsSync('.env')) {
	config({ path: '.env' });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error(
		'DATABASE_URL не задан. На Railway проверьте переменные окружения сервиса (Variables → DATABASE_URL).',
	);
}

export default defineConfig({
	migrations: {
		path: 'prisma/migrations',
		seed: 'npx ts-node prisma/seed.ts',
	},
	datasource: {
		url: databaseUrl,
	},
})
