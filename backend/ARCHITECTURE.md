# Bar CRM — Architecture v1

## Project
Internal CRM system for bar network.
Platform: Telegram Mini App (future web site).

## Stack
- Backend: NestJS + REST
- Database: PostgreSQL
- ORM: Prisma
- Auth: Telegram login + JWT
- Hosting: local → Railway / Vercel

## Core principles
- One module = one business entity
- Business logic only in services
- Controllers are thin
- RBAC via Guards (no ifs in services)
- Bar access is separated from roles
- No product stock in v1 (money-based only)

## Roles
- ADMIN: full access
- MANAGER: limited bars, cost price access
- WORKER: one bar, revenue/expenses only

## Product types
- PRODUCT: main bar products
- SPORT_PIT: sold only as full jars

## Access rules
- ADMIN: all bars
- MANAGER: assigned bars only
- WORKER: one bar only

## Finance logic
- Revenue: one record per bar per day (cash + card)
- Expenses: simple amount records
- Purchases: total-based, no stock logic

## Validation
- See [docs/WHITELIST_RULE.md](docs/WHITELIST_RULE.md) for ValidationPipe configuration
- Global ValidationPipe: `whitelist: false`, `forbidNonWhitelisted: false`
- For strict @Body() validation: apply ValidationPipe locally per parameter
- Query DTO must be created inside modules, not in common/

## Forbidden
- No business logic in controllers
- No role checks inside services
- No direct DB access outside PrismaService
- No architecture changes without update of this document
- No `whitelist: true` in global ValidationPipe (breaks @Query())