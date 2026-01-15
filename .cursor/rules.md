# Cursor Rules — Bar CRM Backend

## Project Context
This is an internal CRM backend for a bar network.
Architecture and rules are defined in ARCHITECTURE.md.

## Stack
- NestJS (REST)
- Prisma + PostgreSQL
- Prisma v7
- class-validator for DTO validation

## Core Rules (STRICT)

1. DO NOT modify prisma/schema.prisma.
2. DO NOT change existing database models or relations.
3. One module = one business entity.
4. Business logic ONLY in services.
5. Controllers must be thin (routing only).
6. Use PrismaService for all database access.
7. No direct PrismaClient instantiation.
8. No role or access logic inside services (RBAC via guards later).
9. Do not touch other modules unless explicitly requested.
10. Follow existing module patterns (Revenue is the reference).

## DTO Rules
- Always use class-validator decorators.
- Use explicit DTOs for create/update.
- Update DTO fields must be optional.

## API Style
- REST endpoints only.
- No GraphQL.
- No WebSockets.

## Forbidden
- No architecture refactoring.
- No global changes.
- No changes to app.module.ts unless explicitly requested.
- No auth/guards unless explicitly requested.

## Code Style
- Prefer clarity over abstraction.
- No overengineering.
- Follow existing naming conventions.

If unsure — ask or do nothing.
