# ValidationPipe Whitelist Rule

## ⚠️ Проблема

NestJS `ValidationPipe` с параметрами `whitelist: true` и `forbidNonWhitelisted: true` **НЕ совместим** с `@Query()` параметрами.

### Причина

1. TypeScript стирает типы при компиляции в JavaScript
2. `reflect-metadata` не может определить metatype для query-объектов
3. NestJS получает `metatype = Object` вместо класса DTO
4. Все query-поля считаются "лишними" и возвращается ошибка 400:
   ```json
   {
     "statusCode": 400,
     "message": ["property barId should not exist", "property date should not exist"]
   }
   ```

---

## ✅ Решение

### 1. Глобальный ValidationPipe — без whitelist

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: false,           // ❌ НЕ использовать с @Query()
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

### 2. Для @Body() — применять строгую валидацию локально

Если нужна строгая валидация body (удаление лишних полей), применяй pipe на уровне параметра:

```typescript
@Post()
create(
  @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) 
  dto: CreateDto
) {
  // ...
}
```

### 3. Всегда создавать отдельные DTO для Query параметров

```typescript
// ✅ Хорошо: отдельный файл для filter DTO внутри модуля
// src/revenue/dto/revenue-filter.dto.ts
export class RevenueFilterDto {
  @IsOptional()
  @IsUUID('4')
  barId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in format yyyy-MM-dd' })
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

## 📋 Чеклист для NestJS проекта

| Проверка | Описание |
|----------|----------|
| ⬜ `whitelist: false` | ValidationPipe настроен без whitelist |
| ⬜ DTO в модулях | DTO для Query созданы внутри модулей (не в common) |
| ⬜ `emitDecoratorMetadata` | `emitDecoratorMetadata: true` в tsconfig.json |
| ⬜ `experimentalDecorators` | `experimentalDecorators: true` в tsconfig.json |
| ⬜ `reflect-metadata` | `import 'reflect-metadata'` первой строкой в main.ts |

---

## 🚫 Запрещено

- Использовать `whitelist: true` глобально при наличии `@Query()` эндпоинтов
- Помещать Query DTO в общие файлы (`common/dto/filter.dto.ts`) — это приводит к коллизиям импортов
- Игнорировать ошибки 400 "property ... should not exist" — они всегда связаны с этой проблемой

---

## 📝 Краткое правило

> **`whitelist: true` + `@Query()` = 400 Bad Request**
> 
> Используй `whitelist: false` глобально, а строгую валидацию применяй локально к `@Body()`.

---

## 🔗 Ссылки

- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)
