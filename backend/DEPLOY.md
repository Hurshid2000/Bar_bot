# Инструкции по деплою

## Подготовка к деплою

### 1. Переменные окружения

Создайте файл `.env` со следующими переменными:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/bar_crm?schema=public
# Или для Docker Compose:
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=bar_crm
POSTGRES_PORT=5432

# JWT
JWT_SECRET=your_jwt_secret_key_here_min_32_characters

# Telegram Bot
BOT_TOKEN=your_telegram_bot_token_from_botfather

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### 2. Генерация JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Деплой с Docker Compose (рекомендуется)

### Локальный деплой

```bash
# 1. Создайте .env файл (см. выше)

# 2. Запустите сервисы
docker-compose up -d

# 3. Проверьте статус
docker-compose ps

# 4. Проверьте логи
docker-compose logs -f backend

# 5. Проверьте health check
curl http://localhost:3000/health
```

### Обновление

```bash
# 1. Остановите контейнеры
docker-compose down

# 2. Пересоберите образы
docker-compose build --no-cache

# 3. Запустите заново
docker-compose up -d
```

## Деплой на сервер (VPS/Cloud)

### Вариант 1: Docker на сервере

1. **Подключитесь к серверу:**
   ```bash
   ssh user@your-server.com
   ```

2. **Установите Docker и Docker Compose:**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo apt-get install docker-compose-plugin
   ```

3. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/your-username/Bar_Bot.git
   cd Bar_Bot/backend
   ```

4. **Создайте .env файл:**
   ```bash
   nano .env
   # Вставьте переменные окружения
   ```

5. **Запустите:**
   ```bash
   docker-compose up -d
   ```

6. **Настройте Nginx (опционально, для HTTPS):**
   ```nginx
   server {
       listen 80;
       server_name api.your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Вариант 2: Без Docker

1. **Установите зависимости:**
   ```bash
   # Node.js 20+
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # PostgreSQL
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Настройте базу данных:**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE bar_crm;
   CREATE USER bar_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE bar_crm TO bar_user;
   \q
   ```

3. **Клонируйте и настройте:**
   ```bash
   git clone https://github.com/your-username/Bar_Bot.git
   cd Bar_Bot/backend
   npm install
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Создайте .env файл**

5. **Запустите с PM2:**
   ```bash
   npm install -g pm2
   npm run build
   pm2 start dist/main.js --name bar-bot-backend
   pm2 save
   pm2 startup
   ```

## Проверка деплоя

1. **Health check:**
   ```bash
   curl http://your-server:3000/health
   ```

2. **Swagger документация:**
   ```
   http://your-server:3000/api
   ```

3. **Тест авторизации:**
   ```bash
   curl -X POST http://your-server:3000/auth/telegram \
     -H "Content-Type: application/json" \
     -d '{"initData": "your_telegram_init_data"}'
   ```

## Мониторинг

### Docker Compose

```bash
# Логи в реальном времени
docker-compose logs -f backend

# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats
```

### PM2

```bash
# Статус
pm2 status

# Логи
pm2 logs bar-bot-backend

# Мониторинг
pm2 monit
```

## Резервное копирование базы данных

```bash
# Создание бэкапа
docker exec bar-bot-postgres pg_dump -U postgres bar_crm > backup.sql

# Восстановление
docker exec -i bar-bot-postgres psql -U postgres bar_crm < backup.sql
```

## Обновление приложения

```bash
# 1. Остановите сервисы
docker-compose down

# 2. Обновите код
git pull origin master

# 3. Пересоберите и запустите
docker-compose build --no-cache
docker-compose up -d

# 4. Примените миграции (если есть)
docker exec bar-bot-backend npx prisma migrate deploy
```

## Безопасность

1. **Используйте HTTPS** (настройте SSL сертификат через Let's Encrypt)
2. **Ограничьте доступ к порту 5432** (PostgreSQL) только для backend
3. **Используйте сильные пароли** для базы данных
4. **Регулярно обновляйте зависимости:**
   ```bash
   npm audit
   npm audit fix
   ```
5. **Настройте firewall:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

## Troubleshooting

### Контейнер не запускается

```bash
# Проверьте логи
docker-compose logs backend

# Проверьте переменные окружения
docker-compose config
```

### Ошибки подключения к БД

```bash
# Проверьте статус PostgreSQL
docker-compose ps postgres

# Проверьте логи PostgreSQL
docker-compose logs postgres

# Проверьте DATABASE_URL в .env
```

### Миграции не применяются

```bash
# Примените вручную
docker exec bar-bot-backend npx prisma migrate deploy

# Проверьте статус миграций
docker exec bar-bot-backend npx prisma migrate status
```
