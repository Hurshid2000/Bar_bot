import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Загружаем .env файл из текущей директории (backend)
// process.cwd() вернет путь к директории, откуда запущена команда
config({ path: '.env' });

export default defineConfig({
	migrations: {
		path: 'prisma/migrations',
	},
	datasource: {
		url: process.env.DATABASE_URL!,
	},
})
