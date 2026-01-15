# Инструкция по тестированию API расходов

> 📖 **Для полного руководства по тестированию всех API endpoints см. [TESTING_FULL.md](./TESTING_FULL.md)**

## Шаг 1: Установка зависимостей

```bash
cd backend
npm install
```

## Шаг 2: Запуск приложения

```bash
npm run start:dev
```

Ожидаемый результат:
```
🚀 Nest application successfully started on port 3000
📡 API available at: http://localhost:3000
```

## Шаг 3: Создание barId через Prisma Studio

В **новом терминале** (не закрывая сервер):

**Важно:** Перейдите в папку `backend` перед запуском:

```bash
cd backend
npx prisma studio
```

Или из корня проекта:

```bash
cd backend && npx prisma studio
```

В браузере откроется Prisma Studio:

1. Откройте таблицу **Bar**
2. Нажмите **"Add record"**
3. Заполните:
   - `name`: например, "Embassy Bar"
   - `isActive`: `true`
4. Нажмите **"Save 1 change"**
5. **Скопируйте `id`** (UUID) — это ваш `barId`

## Шаг 4: Тестирование POST /expenses

### Вариант A: через curl

```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "ВСТАВЬ_СЮДА_UUID_ИЗ_STUDIO",
    "amount": 250000,
    "description": "Закупка льда"
  }'
```

### Вариант B: через Postman

- **Method**: `POST`
- **URL**: `http://localhost:3000/expenses`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "barId": "ВСТАВЬ_СЮДА_UUID_ИЗ_STUDIO",
  "amount": 250000,
  "description": "Закупка льда"
}
```

✅ **Ожидаемый результат**: JSON с полями `id`, `barId`, `amount`, `description`, `createdAt`

## Шаг 5: Проверка записи в БД

### Способ 1: Prisma Studio

В Prisma Studio откройте таблицу **Expense** — должна появиться новая запись с вашими данными.

### Способ 2: GET запрос

```bash
curl "http://localhost:3000/expenses?barId=ВСТАВЬ_UUID"
```

Или в Postman:
- **Method**: `GET`
- **URL**: `http://localhost:3000/expenses?barId=ВСТАВЬ_UUID`

✅ **Ожидаемый результат**: массив с расходами, включая вашу запись

## Шаг 6: Проверка валидации

### Тест 1: без barId (должна быть ошибка 400)

```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250000,
    "description": "Закупка льда"
  }'
```

### Тест 2: отрицательный amount (должна быть ошибка 400)

```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "UUID",
    "amount": -10,
    "description": "test"
  }'
```

### Тест 3: пустое description (должна быть ошибка 400)

```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "UUID",
    "amount": 10,
    "description": ""
  }'
```

## Возможные проблемы

### Ошибка 404 при POST /expenses

Проверьте:
- Приложение запущено (`npm run start:dev`)
- Порт 3000 свободен
- URL правильный: `http://localhost:3000/expenses`

### Ошибка подключения к БД

Проверьте файл `.env` — должна быть строка:
```
DATABASE_URL="postgresql://..."
```

### Ошибки компиляции TypeScript

Убедитесь, что установлены все зависимости:
```bash
npm install
```
