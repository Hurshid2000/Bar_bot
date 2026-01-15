# Инструкция по тестированию через Postman

## Шаг 1: Запуск сервера

```bash
cd backend
npm run start:dev
```

Сервер запустится на `http://localhost:3000`

---

## Шаг 2: Получение JWT токена (тестовый endpoint)

### POST `/auth/test`

**Body (JSON):**
```json
{
  "telegramId": "123456789",
  "name": "Test User",
  "role": "ADMIN"
}
```

**Возможные роли:** `ADMIN`, `MANAGER`, `WORKER`

**Ответ:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "role": "ADMIN",
    "name": "Test User"
  }
}
```

**Скопируйте `accessToken` для следующих запросов!**

---

## Шаг 3: Создание бара

### POST `/bars`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (JSON):**
```json
{
  "name": "Test Bar",
  "isActive": true
}
```

**Ответ:**
```json
{
  "id": "bar-uuid",
  "name": "Test Bar",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Скопируйте `id` бара!**

---

## Шаг 4: Связывание пользователя с баром (через Prisma Studio или SQL)

Для тестирования BarAccessGuard нужно связать пользователя с баром через таблицу `UserBar`.

**Вариант 1: Через Prisma Studio**
```bash
npx prisma studio
```
Перейдите в таблицу `UserBar` и создайте запись:
- `userId` - ID пользователя из шага 2
- `barId` - ID бара из шага 3

**Вариант 2: Через SQL**
```sql
INSERT INTO "UserBar" (id, "userId", "barId")
VALUES (gen_random_uuid(), 'USER_ID', 'BAR_ID');
```

---

## Шаг 5: Тестирование Guards

### Тест 1: Получить все бары (требует авторизации)

**GET `/bars`**

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Ожидаемый результат:** Список всех баров

---

### Тест 2: Получить конкретный бар (проверка BarAccessGuard)

**GET `/bars/:barId`**

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Параметры:**
- `:barId` - ID бара, к которому у пользователя есть доступ

**Ожидаемый результат:** Данные бара

**Если пользователь не имеет доступа:**
```json
{
  "statusCode": 403,
  "message": "You do not have access to this bar"
}
```

---

### Тест 3: Создать бар (требует авторизации)

**POST `/bars`**

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body:**
```json
{
  "name": "New Bar"
}
```

---

### Тест 4: Без токена (должна быть ошибка 401)

**GET `/bars`**

**Без заголовка Authorization**

**Ожидаемый результат:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Шаг 6: Тестирование разных ролей

### Создать пользователя с ролью MANAGER

**POST `/auth/test`**
```json
{
  "telegramId": "987654321",
  "name": "Manager User",
  "role": "MANAGER"
}
```

### Создать пользователя с ролью WORKER

**POST `/auth/test`**
```json
{
  "telegramId": "555555555",
  "name": "Worker User",
  "role": "WORKER"
}
```

Свяжите каждого пользователя с разными барами и протестируйте доступ.

---

## Важные заметки

1. **Тестовый endpoint `/auth/test`** - только для разработки! Удалить в продакшене!
2. **ADMIN** имеет доступ ко всем барам автоматически
3. **MANAGER** и **WORKER** имеют доступ только к назначенным барам
4. Все эндпоинты защищены JWT, кроме `/auth/telegram` и `/auth/test`

---

## Примеры запросов в Postman

### Коллекция Postman

1. **Auth - Test Login**
   - Method: POST
   - URL: `http://localhost:3000/auth/test`
   - Body: JSON (см. выше)

2. **Bars - Get All**
   - Method: GET
   - URL: `http://localhost:3000/bars`
   - Headers: `Authorization: Bearer {{token}}`

3. **Bars - Get One**
   - Method: GET
   - URL: `http://localhost:3000/bars/{{barId}}`
   - Headers: `Authorization: Bearer {{token}}`

4. **Bars - Create**
   - Method: POST
   - URL: `http://localhost:3000/bars`
   - Headers: `Authorization: Bearer {{token}}`
   - Body: JSON (см. выше)

---

## Переменные Postman

Создайте переменные в Postman:
- `baseUrl`: `http://localhost:3000`
- `token`: ваш JWT токен
- `barId`: ID созданного бара
- `userId`: ID пользователя

---

# Тестирование Categories модуля

## Шаг 1: Получить токены для разных ролей

### ADMIN токен

**POST `/auth/test`**
```json
{
  "telegramId": "111111111",
  "name": "Admin User",
  "role": "ADMIN"
}
```

Скопируй `accessToken` → `ADMIN_TOKEN`

---

### MANAGER токен

**POST `/auth/test`**
```json
{
  "telegramId": "222222222",
  "name": "Manager User",
  "role": "MANAGER"
}
```

Скопируй `accessToken` → `MANAGER_TOKEN`

---

### WORKER токен

**POST `/auth/test`**
```json
{
  "telegramId": "333333333",
  "name": "Worker User",
  "role": "WORKER"
}
```

Скопируй `accessToken` → `WORKER_TOKEN`

---

## Шаг 2: Создать категорию (ADMIN или MANAGER)

### POST `/categories`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Body (JSON):**
```json
{
  "name": "Напитки"
}
```

**Ответ:**
```json
{
  "id": "category-uuid-1",
  "name": "Напитки"
}
```

**Скопируй `id` → `CATEGORY_ID_1`**

---

### Создать еще категории:

**POST `/categories`** (с ADMIN_TOKEN)
```json
{
  "name": "Еда"
}
```

**POST `/categories`** (с ADMIN_TOKEN)
```json
{
  "name": "Спортпит"
}
```

---

## Шаг 3: Получить все категории (все роли)

### GET `/categories`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Ответ:**
```json
[
  {
    "id": "category-uuid-1",
    "name": "Еда"
  },
  {
    "id": "category-uuid-2",
    "name": "Напитки"
  },
  {
    "id": "category-uuid-3",
    "name": "Спортпит"
  }
]
```

**Категории отсортированы по имени (A-Z)**

---

## Шаг 4: Получить одну категорию

### GET `/categories/:id`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**URL:** `http://localhost:3000/categories/CATEGORY_ID_1`

**Ответ:**
```json
{
  "id": "category-uuid-1",
  "name": "Напитки"
}
```

---

## Шаг 5: Обновить категорию (ADMIN или MANAGER)

### PATCH `/categories/:id`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**URL:** `http://localhost:3000/categories/CATEGORY_ID_1`

**Body (JSON):**
```json
{
  "name": "Алкогольные напитки"
}
```

**Ответ:**
```json
{
  "id": "category-uuid-1",
  "name": "Алкогольные напитки"
}
```

---

## Шаг 6: Удалить категорию (только ADMIN)

### DELETE `/categories/:id`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**URL:** `http://localhost:3000/categories/CATEGORY_ID_3`

**Ответ:**
```json
{
  "id": "category-uuid-3",
  "name": "Спортпит"
}
```

---

## Шаг 7: Тестирование Guards и прав доступа

### Тест 1: WORKER пытается создать категорию (должна быть ошибка 403)

**POST `/categories`**

**Headers:**
```
Authorization: Bearer WORKER_TOKEN
```

**Body:**
```json
{
  "name": "Новая категория"
}
```

**Ожидаемый результат:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

### Тест 2: WORKER может читать категории

**GET `/categories`**

**Headers:**
```
Authorization: Bearer WORKER_TOKEN
```

**Ожидаемый результат:** Список всех категорий (200 OK)

---

### Тест 3: MANAGER может создавать категории

**POST `/categories`**

**Headers:**
```
Authorization: Bearer MANAGER_TOKEN
```

**Body:**
```json
{
  "name": "Категория от менеджера"
}
```

**Ожидаемый результат:** Созданная категория (201 Created)

---

### Тест 4: MANAGER НЕ может удалять категории (только ADMIN)

**DELETE `/categories/:id`**

**Headers:**
```
Authorization: Bearer MANAGER_TOKEN
```

**Ожидаемый результат:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

# Тестирование Products модуля

## Шаг 1: Подготовка данных

Нужно иметь:
- ✅ Бар (BAR_ID)
- ✅ Категорию (CATEGORY_ID)
- ✅ Токены для разных ролей (ADMIN_TOKEN, MANAGER_TOKEN, WORKER_TOKEN)

---

## Шаг 2: Создать продукт (ADMIN или MANAGER)

### POST `/products`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Body (JSON):**
```json
{
  "name": "Кока-Кола",
  "barcode": "4600051000057",
  "type": "PRODUCT",
  "costPrice": 50.0,
  "price": 100.0,
  "barId": "BAR_ID",
  "categoryId": "CATEGORY_ID"
}
```

**Возможные типы:** `PRODUCT`, `SPORT_PIT` (по умолчанию `PRODUCT`)

**Ответ:**
```json
{
  "id": "product-uuid-1",
  "name": "Кока-Кола",
  "barcode": "4600051000057",
  "type": "PRODUCT",
  "costPrice": 50.0,
  "price": 100.0,
  "barId": "BAR_ID",
  "categoryId": "CATEGORY_ID",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Скопируй `id` → `PRODUCT_ID_1`**

---

## Шаг 3: Получить все продукты

### GET `/products`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Ответ:** Список всех продуктов с `costPrice`

---

### GET `/products?barId=BAR_ID`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Ответ:** Продукты конкретного бара

---

## Шаг 4: Получить продукты по бару

### GET `/products/bar/:barId`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**URL:** `http://localhost:3000/products/bar/BAR_ID`

**Ответ:** Продукты конкретного бара

---

## Шаг 5: Получить один продукт

### GET `/products/:id`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**URL:** `http://localhost:3000/products/PRODUCT_ID_1`

**Ответ:** Данные продукта с `costPrice`

---

## Шаг 6: Обновить продукт (ADMIN или MANAGER)

### PATCH `/products/:id`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**URL:** `http://localhost:3000/products/PRODUCT_ID_1`

**Body (JSON):**
```json
{
  "price": 120.0,
  "name": "Кока-Кола 0.5л"
}
```

**Ответ:** Обновленный продукт

---

## Шаг 7: Удалить продукт (только ADMIN)

### DELETE `/products/:id`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**URL:** `http://localhost:3000/products/PRODUCT_ID_1`

**Ответ:** Удаленный продукт

---

## Шаг 8: Тестирование скрытия costPrice для WORKER

### WORKER получает продукт (БЕЗ costPrice)

**GET `/products/:id`**

**Headers:**
```
Authorization: Bearer WORKER_TOKEN
```

**URL:** `http://localhost:3000/products/PRODUCT_ID_1`

**Ответ (WORKER):**
```json
{
  "id": "product-uuid-1",
  "name": "Кока-Кола",
  "barcode": "4600051000057",
  "type": "PRODUCT",
  "price": 100.0,
  "barId": "BAR_ID",
  "categoryId": "CATEGORY_ID",
  "bar": { ... },
  "category": { ... },
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Обрати внимание:** НЕТ поля `costPrice`!

---

### ADMIN получает тот же продукт (С costPrice)

**GET `/products/:id`**

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Ответ (ADMIN):**
```json
{
  "id": "product-uuid-1",
  "name": "Кока-Кола",
  "barcode": "4600051000057",
  "type": "PRODUCT",
  "costPrice": 50.0,
  "price": 100.0,
  ...
}
```

**Обрати внимание:** ЕСТЬ поле `costPrice`!

---

## Шаг 9: Тестирование доступа к бару

### WORKER пытается получить продукт из недоступного бара

**GET `/products/:id`**

**Headers:**
```
Authorization: Bearer WORKER_TOKEN
```

**URL:** `http://localhost:3000/products/PRODUCT_ID_1`

**Если продукт принадлежит бару, к которому WORKER не имеет доступа:**

**Ожидаемый результат:**
```json
{
  "statusCode": 403,
  "message": "You do not have access to this bar"
}
```

---

### WORKER получает продукты своего бара

**GET `/products?barId=BAR_ID`**

**Headers:**
```
Authorization: Bearer WORKER_TOKEN
```

**Если WORKER имеет доступ к BAR_ID:**

**Ожидаемый результат:** Список продуктов БЕЗ `costPrice`

---

## Шаг 10: Тестирование разных ролей

### WORKER НЕ может создавать продукты

**POST `/products`**

**Headers:**
```
Authorization: Bearer WORKER_TOKEN
```

**Body:**
```json
{
  "name": "Новый продукт",
  "costPrice": 50.0,
  "price": 100.0,
  "barId": "BAR_ID",
  "categoryId": "CATEGORY_ID"
}
```

**Ожидаемый результат:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

### MANAGER может создавать продукты

**POST `/products`**

**Headers:**
```
Authorization: Bearer MANAGER_TOKEN
```

**Body:**
```json
{
  "name": "Продукт от менеджера",
  "costPrice": 60.0,
  "price": 120.0,
  "barId": "BAR_ID",
  "categoryId": "CATEGORY_ID"
}
```

**Ожидаемый результат:** Созданный продукт (201 Created)

---

### MANAGER НЕ может удалять продукты (только ADMIN)

**DELETE `/products/:id`**

**Headers:**
```
Authorization: Bearer MANAGER_TOKEN
```

**Ожидаемый результат:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

## Примеры запросов в Postman для Products

1. **Products - Get All**
   - Method: GET
   - URL: `http://localhost:3000/products`
   - Headers: `Authorization: Bearer {{token}}`

2. **Products - Get All by Bar**
   - Method: GET
   - URL: `http://localhost:3000/products?barId={{barId}}`
   - Headers: `Authorization: Bearer {{token}}`

3. **Products - Get by Bar ID**
   - Method: GET
   - URL: `http://localhost:3000/products/bar/{{barId}}`
   - Headers: `Authorization: Bearer {{token}}`

4. **Products - Get One**
   - Method: GET
   - URL: `http://localhost:3000/products/{{productId}}`
   - Headers: `Authorization: Bearer {{token}}`

5. **Products - Create**
   - Method: POST
   - URL: `http://localhost:3000/products`
   - Headers: `Authorization: Bearer {{adminToken}}` или `{{managerToken}}`
   - Body: `{ "name": "...", "costPrice": 50.0, "price": 100.0, "barId": "...", "categoryId": "..." }`

6. **Products - Update**
   - Method: PATCH
   - URL: `http://localhost:3000/products/{{productId}}`
   - Headers: `Authorization: Bearer {{adminToken}}` или `{{managerToken}}`
   - Body: `{ "price": 120.0 }`

7. **Products - Delete**
   - Method: DELETE
   - URL: `http://localhost:3000/products/{{productId}}`
   - Headers: `Authorization: Bearer {{adminToken}}`

---

## Переменные Postman (обновить)

Добавь переменные:
- `categoryId`: ID созданной категории
- `productId`: ID созданного продукта
- `adminToken`: токен ADMIN
- `managerToken`: токен MANAGER
- `workerToken`: токен WORKER
