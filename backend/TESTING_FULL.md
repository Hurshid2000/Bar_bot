# Полное руководство по тестированию API

## Подготовка

1. **Убедитесь, что сервер запущен:**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Откройте Prisma Studio в другом терминале:**
   ```bash
   cd backend
   npx prisma studio
   ```

3. **Создайте тестовый Bar:**
   - В Prisma Studio откройте таблицу **Bar**
   - Нажмите **"Add record"**
   - Заполните:
     - `name`: "Test Bar"
     - `isActive`: `true`
   - Сохраните и **скопируйте `id`** (UUID)
   - Обозначим его как `BAR_ID` для дальнейших команд

---

## Часть 1: Тестирование Expenses API

### 1.1. Создание расхода (POST /expenses)

```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "BAR_ID",
    "amount": 250000,
    "description": "Закупка льда"
  }'
```

✅ **Ожидаемый результат:** JSON с полями `id`, `barId`, `amount`, `description`, `createdAt`

**Пример ответа:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "barId": "BAR_ID",
  "amount": 250000,
  "description": "Закупка льда",
  "createdAt": "2026-01-15T01:00:00.000Z"
}
```

### 1.2. Получение всех расходов (GET /expenses)

```bash
curl "http://localhost:3000/expenses"
```

✅ **Ожидаемый результат:** массив всех расходов, отсортированных по `createdAt` (новые первыми)

### 1.3. Получение расходов по barId (GET /expenses?barId=...)

```bash
curl "http://localhost:3000/expenses?barId=BAR_ID"
```

✅ **Ожидаемый результат:** массив расходов для конкретного бара

### 1.4. Проверка валидации Expenses

#### Тест 1: Отсутствует barId
```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250000,
    "description": "Закупка льда"
  }'
```
✅ **Ожидаемый результат:** ошибка 400 Bad Request

#### Тест 2: Отрицательный amount
```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "BAR_ID",
    "amount": -10,
    "description": "test"
  }'
```
✅ **Ожидаемый результат:** ошибка 400 Bad Request

#### Тест 3: Пустое description
```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "BAR_ID",
    "amount": 10,
    "description": ""
  }'
```
✅ **Ожидаемый результат:** ошибка 400 Bad Request

#### Тест 4: Несуществующий barId
```bash
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "00000000-0000-0000-0000-000000000000",
    "amount": 1000,
    "description": "test"
  }'
```
✅ **Ожидаемый результат:** ошибка 500 (foreign key constraint violation)

---

## Часть 2: Тестирование Revenue API

### 2.1. Создание дохода (POST /revenue)

```bash
curl -X POST http://localhost:3000/revenue \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "BAR_ID",
    "date": "2026-01-15",
    "cash": 500000,
    "card": 300000
  }'
```

✅ **Ожидаемый результат:** JSON с полями `id`, `barId`, `date`, `cash`, `card`, `createdAt`

**Пример ответа:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "barId": "BAR_ID",
  "date": "2026-01-15T00:00:00.000Z",
  "cash": 500000,
  "card": 300000,
  "createdAt": "2026-01-15T01:00:00.000Z"
}
```

### 2.2. Получение всех доходов (GET /revenue)

```bash
curl "http://localhost:3000/revenue"
```

✅ **Ожидаемый результат:** массив всех доходов, отсортированных по `date` (новые первыми)

### 2.3. Получение доходов по barId (GET /revenue?barId=...)

```bash
curl "http://localhost:3000/revenue?barId=BAR_ID"
```

✅ **Ожидаемый результат:** массив доходов для конкретного бара

### 2.4. Проверка уникальности (один доход на бар в день)

Попробуйте создать второй доход для того же бара и даты:

```bash
curl -X POST http://localhost:3000/revenue \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "BAR_ID",
    "date": "2026-01-15",
    "cash": 600000,
    "card": 400000
  }'
```

✅ **Ожидаемый результат:** ошибка 400 Bad Request с сообщением:
```json
{
  "statusCode": 400,
  "message": "Revenue record already exists for this bar and date",
  "error": "Bad Request"
}
```

### 2.5. Проверка валидации Revenue

#### Тест 1: Отсутствует barId
```bash
curl -X POST http://localhost:3000/revenue \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-15",
    "cash": 500000,
    "card": 300000
  }'
```
✅ **Ожидаемый результат:** ошибка 400 Bad Request

#### Тест 2: Отрицательный cash
```bash
curl -X POST http://localhost:3000/revenue \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "BAR_ID",
    "date": "2026-01-15",
    "cash": -100,
    "card": 300000
  }'
```
✅ **Ожидаемый результат:** ошибка 400 Bad Request

#### Тест 3: Отрицательный card
```bash
curl -X POST http://localhost:3000/revenue \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "BAR_ID",
    "date": "2026-01-15",
    "cash": 500000,
    "card": -50
  }'
```
✅ **Ожидаемый результат:** ошибка 400 Bad Request

#### Тест 4: Неверный формат даты
```bash
curl -X POST http://localhost:3000/revenue \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "BAR_ID",
    "date": "invalid-date",
    "cash": 500000,
    "card": 300000
  }'
```
✅ **Ожидаемый результат:** ошибка 400 Bad Request

#### Тест 5: Несуществующий barId
```bash
curl -X POST http://localhost:3000/revenue \
  -H "Content-Type: application/json" \
  -d '{
    "barId": "00000000-0000-0000-0000-000000000000",
    "date": "2026-01-15",
    "cash": 500000,
    "card": 300000
  }'
```
✅ **Ожидаемый результат:** ошибка 500 (foreign key constraint violation)

---

## Часть 3: Интеграционное тестирование

### 3.1. Проверка связей в БД

1. Создайте расход для бара через API
2. В Prisma Studio откройте таблицу **Expense**
3. Проверьте, что:
   - `barId` соответствует существующему бару
   - `createdAt` заполнен автоматически
   - Все поля заполнены корректно

4. Нажмите на `barId` — должна открыться связанная запись из таблицы **Bar**

### 3.2. Проверка фильтрации по barId

1. Создайте второй бар в Prisma Studio:
   - `name`: "Second Bar"
   - `isActive`: `true`
   - Скопируйте его `id` как `BAR_ID_2`

2. Создайте расходы для обоих баров:
   ```bash
   # Расход для первого бара
   curl -X POST http://localhost:3000/expenses \
     -H "Content-Type: application/json" \
     -d '{
       "barId": "BAR_ID",
       "amount": 100000,
       "description": "Расход для первого бара"
     }'
   
   # Расход для второго бара
   curl -X POST http://localhost:3000/expenses \
     -H "Content-Type: application/json" \
     -d '{
       "barId": "BAR_ID_2",
       "amount": 200000,
       "description": "Расход для второго бара"
     }'
   ```

3. Проверьте фильтрацию:
   ```bash
   # Только расходы первого бара
   curl "http://localhost:3000/expenses?barId=BAR_ID"
   
   # Только расходы второго бара
   curl "http://localhost:3000/expenses?barId=BAR_ID_2"
   
   # Все расходы
   curl "http://localhost:3000/expenses"
   ```

4. Убедитесь, что фильтрация работает корректно

### 3.3. Проверка сортировки

1. Создайте несколько расходов с задержкой:
   ```bash
   curl -X POST http://localhost:3000/expenses \
     -H "Content-Type: application/json" \
     -d '{"barId": "BAR_ID", "amount": 1000, "description": "Первый"}'
   
   sleep 1
   
   curl -X POST http://localhost:3000/expenses \
     -H "Content-Type: application/json" \
     -d '{"barId": "BAR_ID", "amount": 2000, "description": "Второй"}'
   
   sleep 1
   
   curl -X POST http://localhost:3000/expenses \
     -H "Content-Type: application/json" \
     -d '{"barId": "BAR_ID", "amount": 3000, "description": "Третий"}'
   ```

2. Проверьте GET /expenses — должны быть отсортированы по `createdAt` (desc)
   - Последний созданный должен быть первым в списке

3. Создайте несколько доходов с разными датами:
   ```bash
   curl -X POST http://localhost:3000/revenue \
     -H "Content-Type: application/json" \
     -d '{"barId": "BAR_ID", "date": "2026-01-10", "cash": 100000, "card": 50000}'
   
   curl -X POST http://localhost:3000/revenue \
     -H "Content-Type: application/json" \
     -d '{"barId": "BAR_ID", "date": "2026-01-15", "cash": 200000, "card": 100000}'
   
   curl -X POST http://localhost:3000/revenue \
     -H "Content-Type: application/json" \
     -d '{"barId": "BAR_ID", "date": "2026-01-12", "cash": 150000, "card": 75000}'
   ```

4. Проверьте GET /revenue — должны быть отсортированы по `date` (desc)
   - Самая поздняя дата должна быть первой

---

## Часть 4: Проверка через Prisma Studio

### 4.1. Визуальная проверка данных

1. Откройте таблицу **Expense** в Prisma Studio
2. Убедитесь, что все созданные расходы отображаются
3. Проверьте правильность данных:
   - `barId` соответствует существующему бару
   - `amount` правильный
   - `description` правильный
   - `createdAt` заполнен

4. Откройте таблицу **Revenue** в Prisma Studio
5. Убедитесь, что все созданные доходы отображаются
6. Проверьте правильность данных:
   - `barId` соответствует существующему бару
   - `date` правильный
   - `cash` и `card` правильные
   - `createdAt` заполнен

### 4.2. Проверка связей

1. В таблице **Expense** нажмите на `barId`
2. Должна открыться связанная запись из таблицы **Bar**
3. Проверьте, что связь работает корректно

4. В таблице **Revenue** нажмите на `barId`
5. Должна открыться связанная запись из таблицы **Bar**
6. Проверьте, что связь работает корректно

---

## Быстрая проверка (чеклист)

### Подготовка
- [ ] Сервер запущен на порту 3000
- [ ] Prisma Studio открыт на порту 5555
- [ ] Создан тестовый Bar

### Expenses API
- [ ] POST /expenses создает расход
- [ ] GET /expenses возвращает все расходы
- [ ] GET /expenses?barId=... возвращает расходы конкретного бара
- [ ] Валидация Expenses работает (400 ошибки для невалидных данных)
- [ ] Данные сохраняются в БД

### Revenue API
- [ ] POST /revenue создает доход
- [ ] GET /revenue возвращает все доходы
- [ ] GET /revenue?barId=... возвращает доходы конкретного бара
- [ ] Уникальность Revenue работает (один доход на день)
- [ ] Валидация Revenue работает (400 ошибки для невалидных данных)
- [ ] Данные сохраняются в БД

### Интеграция
- [ ] Связи между таблицами работают (foreign keys)
- [ ] Сортировка работает корректно
- [ ] Фильтрация по barId работает корректно

---

## Полезные команды для отладки

### Проверка статуса сервера
```bash
# Проверка доступности API
curl http://localhost:3000/expenses

# Проверка конкретного endpoint
curl http://localhost:3000/revenue
```

### Просмотр логов сервера
Логи выводятся в терминале, где запущен `npm run start:dev`

### Очистка тестовых данных
В Prisma Studio можно удалить созданные записи для повторного тестирования:
1. Откройте таблицу
2. Выберите запись
3. Нажмите "Delete record"

### Проверка структуры ответа
```bash
# С форматированием JSON (если установлен jq)
curl http://localhost:3000/expenses | jq

# Или через Python
curl http://localhost:3000/expenses | python -m json.tool
```

---

## Примеры реальных сценариев

### Сценарий 1: Ежедневная работа бариста

1. **Утром:** Создать доход за вчерашний день
   ```bash
   curl -X POST http://localhost:3000/revenue \
     -H "Content-Type: application/json" \
     -d '{
       "barId": "BAR_ID",
       "date": "2026-01-14",
       "cash": 450000,
       "card": 320000
     }'
   ```

2. **Днем:** Зафиксировать расход на закупку
   ```bash
   curl -X POST http://localhost:3000/expenses \
     -H "Content-Type: application/json" \
     -d '{
       "barId": "BAR_ID",
       "amount": 150000,
       "description": "Закупка напитков"
     }'
   ```

3. **Вечером:** Посмотреть все расходы за день
   ```bash
   curl "http://localhost:3000/expenses?barId=BAR_ID"
   ```

### Сценарий 2: Отчетность менеджера

1. **Посмотреть все доходы за период:**
   ```bash
   curl "http://localhost:3000/revenue?barId=BAR_ID"
   ```

2. **Посмотреть все расходы:**
   ```bash
   curl "http://localhost:3000/expenses?barId=BAR_ID"
   ```

---

## Следующие шаги после тестирования

1. ✅ Все тесты пройдены
2. 📝 Документировать API (Swagger/OpenAPI)
3. 🔒 Добавить аутентификацию и авторизацию
4. 🧪 Написать unit-тесты и e2e тесты
5. 🚀 Подготовить к деплою
6. 📊 Добавить аналитику и отчеты

---

## Возможные проблемы и решения

### Проблема: Ошибка 500 при создании записи
**Решение:** Проверьте, что `barId` существует в таблице Bar

### Проблема: Валидация не работает
**Решение:** Убедитесь, что сервер перезапущен после изменений в DTO

### Проблема: Данные не сохраняются
**Решение:** Проверьте подключение к БД в `.env` файле

### Проблема: Prisma Studio не открывается
**Решение:** Убедитесь, что запускаете из папки `backend`

---

**Удачного тестирования! 🚀**
