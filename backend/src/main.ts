import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Глобальная валидация для всех endpoints
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // Удаляет свойства, которых нет в DTO
			forbidNonWhitelisted: true, // Выбрасывает ошибку, если есть лишние свойства
			transform: true, // Автоматически преобразует типы
		}),
	);

	// Глобальный JWT guard (защищает все эндпоинты, кроме помеченных @Public())
	const reflector = app.get(Reflector);
	app.useGlobalGuards(new JwtAuthGuard(reflector));

	// Включаем CORS для работы с фронтендом
	app.enableCors();

	const port = process.env.PORT || 3000;
	await app.listen(port);

	console.log(`🚀 Nest application successfully started on port ${port}`);
	console.log(`📡 API available at: http://localhost:${port}`);
}

bootstrap();
