# Bar CRM Backend

Backend для системы управления сетью баров.

## Технологии

- **NestJS** - фреймворк
- **PostgreSQL** - база данных
- **Prisma** - ORM
- **JWT** - аутентификация
- **Telegram Mini App** - авторизация через Telegram

## Установка

```bash
# Установка зависимостей
npm install

# Настройка базы данных
npx prisma generate
npx prisma migrate deploy

# Запуск в режиме разработки
npm run start:dev
```

## Переменные окружения

Создайте файл `.env` в корне `backend/`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bar_crm?schema=public

# JWT
JWT_SECRET=your_jwt_secret_key_here_min_32_characters

# Telegram Bot
BOT_TOKEN=your_telegram_bot_token_from_botfather

# Server
PORT=3000
NODE_ENV=development

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Генерация JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## API Endpoints

### Публичные

- `GET /health` - проверка здоровья сервиса
- `POST /auth/telegram` - авторизация через Telegram

### Защищенные (требуют JWT токен)

Все остальные endpoints требуют заголовок:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Основные модули

- `/users` - управление пользователями
- `/bars` - управление барами
- `/categories` - управление категориями
- `/products` - управление продуктами
- `/revenue` - выручка
- `/expenses` - расходы
- `/purchases` - закупки
- `/reports` - статистика и отчеты

## Пагинация

Все списки поддерживают пагинацию:

```
GET /products?page=1&limit=20
```

## Фильтрация

Примеры фильтрации:

```
GET /products?barId=xxx&categoryId=yyy&type=PRODUCT
GET /revenue?barId=xxx&startDate=2024-01-01&endDate=2024-01-31
```

## Поиск

```
GET /products?search=кока
GET /categories?search=напит
```

## Статистика

```
GET /reports/bars/:barId/daily?date=2024-01-15
GET /reports/bars/:barId/monthly?month=2024-01
GET /reports/bars/:barId/period?startDate=2024-01-01&endDate=2024-01-31
GET /reports/bars/:barId/top-products?startDate=2024-01-01&endDate=2024-01-31
GET /reports/compare?barIds=id1,id2&startDate=2024-01-01&endDate=2024-01-31
```

## Роли

- **ADMIN** - полный доступ ко всем барам
- **MANAGER** - доступ к назначенным барам, видит себестоимость
- **WORKER** - доступ к одному бару, не видит себестоимость

## Запуск в продакшене

### Вариант 1: Без Docker

```bash
# Сборка
npm run build

# Запуск
npm run start:prod
```

Убедитесь, что установлены все переменные окружения в продакшене!

### Вариант 2: С Docker (рекомендуется)

#### Быстрый старт с Docker Compose

1. Создайте файл `.env` в корне `backend/`:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=bar_crm
POSTGRES_PORT=5432

# Backend
JWT_SECRET=your_jwt_secret_key_here_min_32_characters
BOT_TOKEN=your_telegram_bot_token_from_botfather
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://your-frontend-domain.com
```

2. Запустите все сервисы:

```bash
docker-compose up -d
```

3. Проверьте логи:

```bash
docker-compose logs -f backend
```

4. Остановка:

```bash
docker-compose down
```

#### Сборка Docker образа

```bash
# Сборка образа
docker build -t bar-bot-backend:latest .

# Запуск контейнера
docker run -d \
  --name bar-bot-backend \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/bar_crm \
  -e JWT_SECRET=your_jwt_secret \
  -e BOT_TOKEN=your_bot_token \
  -e NODE_ENV=production \
  -e CORS_ORIGINS=https://your-frontend-domain.com \
  bar-bot-backend:latest
```

#### Миграции базы данных

При использовании Docker Compose миграции применяются автоматически при старте.

Для ручного применения:

```bash
# Внутри контейнера
docker exec -it bar-bot-backend npx prisma migrate deploy

# Или локально (если DATABASE_URL настроен)
npx prisma migrate deploy
```

## Swagger документация

После запуска сервера, Swagger документация доступна по адресу:

```
http://localhost:3000/api
```

В Swagger UI можно:
- Просмотреть все доступные endpoints
- Увидеть схемы запросов и ответов
- Протестировать API прямо в браузере
- Авторизоваться через JWT токен (кнопка "Authorize")

### Авторизация в Swagger

1. Открой `/api` в браузере
2. Нажми кнопку **"Authorize"** (🔒)
3. Вставь JWT токен (полученный через `/auth/telegram`)
4. Нажми **"Authorize"** и **"Close"**
5. Теперь все защищенные endpoints доступны для тестирования

## Документация

Подробная документация по тестированию: `POSTMAN_TESTING.md`
