# Bar CRM Frontend

Frontend приложение для системы управления сетью баров.

## Технологии

- **Vite** - сборщик
- **React** - UI библиотека
- **TypeScript** - типизация
- **Telegram Mini App** - платформа

## Установка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Просмотр собранного приложения
npm run preview
```

## Переменные окружения

Создайте файл `.env` в корне `frontend/`:

```env
VITE_API=https://your-backend-url.railway.app
```

**Важно:** Переменные окружения в Vite должны начинаться с `VITE_`

## Настройка для Vercel

1. **Root Directory:** `frontend`
2. **Build Command:** `npm run build`
3. **Output Directory:** `dist`
4. **Environment Variables:**
   - `VITE_API` = URL твоего Railway бэкенда

## Структура проекта

```
frontend/
├── src/
│   ├── api.ts          # API функции
│   ├── App.tsx         # Главный компонент
│   ├── App.css         # Стили приложения
│   ├── main.tsx        # Точка входа
│   └── vite-env.d.ts   # Типы для Vite и Telegram
├── public/             # Статические файлы
├── index.html          # HTML шаблон
└── vite.config.ts      # Конфигурация Vite
```

## API функции

- `authenticateWithTelegram(initData)` - авторизация через Telegram
- `checkHealth()` - проверка здоровья API
- `saveToken(token)` - сохранение JWT токена
- `getToken()` - получение токена
- `removeToken()` - удаление токена
- `getAuthHeaders()` - создание заголовков с авторизацией

## Telegram Mini App

Приложение автоматически определяет, запущено ли оно в Telegram:

```typescript
// Получение initData от Telegram
const initData = window.Telegram?.WebApp?.initData;
```

## Деплой на Vercel

1. Подключи репозиторий к Vercel
2. Укажи Root Directory: `frontend`
3. Добавь переменную окружения `VITE_API`
4. Задеплой проект
