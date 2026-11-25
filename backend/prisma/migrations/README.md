# Миграции базы данных

## `0_init` — консолидированный baseline

История миграций была приведена к единому baseline `0_init`, который
полностью соответствует текущей `schema.prisma` (все таблицы и enum).
Прежние миграции (`20260114190248_init`, `20260115092522_make_supplier_optional`,
`20260427140909_add_is_sport_pit_to_arrival`) были неполными: `init` не
создавал часть таблиц (`Arrival`, `Order`, `Stock`, `Sale`, `Client`,
`Inventory` и др.), а поздняя миграция делала `ALTER TABLE "Arrival"`, из-за
чего `prisma migrate deploy` на чистой базе падал.

## Новая / пустая база

Ничего делать не нужно — деплой сам применит baseline:

```bash
npx prisma migrate deploy
```

## Существующая база (прод, собранный через `db push` или старые миграции)

Схема там уже есть, поэтому baseline нельзя «применять» заново — его нужно
один раз **зарегистрировать как применённый**. Выполните РОВНО ОДИН РАЗ,
подключившись к нужной базе, **до** деплоя этого изменения:

```bash
cd backend
DATABASE_URL="<строка подключения к прод-базе>" \
  npx prisma migrate resolve --applied 0_init
```

После этого обычный `npx prisma migrate deploy` (он же запускается при старте
контейнера) увидит «No pending migrations» и ничего не сломает. Данные не
затрагиваются.

> Если деплой успел пройти раньше регистрации и миграция `0_init` помечена как
> проваленная, очистите её и повторите:
> ```bash
> DATABASE_URL="<прод>" npx prisma migrate resolve --rolled-back 0_init
> DATABASE_URL="<прод>" npx prisma migrate resolve --applied 0_init
> ```
