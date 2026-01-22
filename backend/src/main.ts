// Импорт reflect-metadata необходим для корректной работы ValidationPipe с DTO в @Query()
// Без него метаданные типов теряются, и ValidationPipe не может определить поля DTO
import 'reflect-metadata';

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Глобальный обработчик ошибок (единый формат ответов)
	app.useGlobalFilters(new HttpExceptionFilter());

	// Глобальная валидация для всех endpoints
	// whitelist и forbidNonWhitelisted отключены, так как они вызывают проблемы с @Query() параметрами
	// (NestJS не может определить metatype для query, что приводит к ошибкам валидации)
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: false,
			forbidNonWhitelisted: false,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true,
			},
		}),
	);

	// Глобальный JWT guard (защищает все эндпоинты, кроме помеченных @Public())
	const reflector = app.get(Reflector);
	app.useGlobalGuards(new JwtAuthGuard(reflector));

	// Включаем CORS для работы с фронтендом
	const corsOrigins = process.env.CORS_ORIGINS
		? process.env.CORS_ORIGINS.split(',')
		: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

	app.enableCors({
		origin: corsOrigins,
		credentials: true,
		methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
		exposedHeaders: ['Content-Type', 'Authorization'],
		preflightContinue: false,
		optionsSuccessStatus: 204,
	});

	// Swagger документация
	const config = new DocumentBuilder()
		.setTitle('Bar CRM API')
		.setDescription('API для системы управления сетью баров')
		.setVersion('1.0')
		.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				name: 'JWT',
				description: 'Enter JWT token',
				in: 'header',
			},
			'JWT-auth', // Это имя должно совпадать с тем, что используется в @ApiBearerAuth()
		)
		.addTag('auth', 'Авторизация через Telegram')
		.addTag('users', 'Управление пользователями')
		.addTag('bars', 'Управление барами')
		.addTag('categories', 'Управление категориями')
		.addTag('products', 'Управление продуктами')
		.addTag('revenue', 'Выручка')
		.addTag('expenses', 'Расходы')
		.addTag('purchases', 'Закупки')
		.addTag('reports', 'Статистика и отчеты')
		.addTag('health', 'Проверка здоровья сервиса')
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document, {
		swaggerOptions: {
			persistAuthorization: true, // Сохраняет токен после перезагрузки страницы
		},
	});

	const port = process.env.PORT || 3000;
	await app.listen(port);

	console.log(`🚀 Nest application successfully started on port ${port}`);
	console.log(`📡 API available at: http://localhost:${port}`);
	console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

bootstrap();
