# Cursor Rules — Bar CRM Project

## Project Context
Internal CRM system for a bar network.
Platform: Telegram Mini App (future web site).

## Project Structure
```
Bar_Bot/
├── backend/          # NestJS Backend
├── frontend/         # Vite + React Frontend
└── .cursor/          # Cursor rules
```

---

## Backend Rules (NestJS)

### Stack
- NestJS (REST API)
- Prisma v7 + PostgreSQL
- JWT Authentication
- Telegram Mini App Auth
- Swagger Documentation

### Core Rules (STRICT)

1. **DO NOT modify** `prisma/schema.prisma` without explicit request
2. **DO NOT change** existing database models or relations
3. **One module = one business entity**
4. **Business logic ONLY in services** (never in controllers)
5. **Controllers must be thin** (routing and validation only)
6. **Use PrismaService** for all database access
7. **No direct PrismaClient** instantiation
8. **No role or access logic** inside services (RBAC via guards)
9. **Follow existing module patterns** (Revenue is the reference)

### DTO Rules
- Always use `class-validator` decorators
- Use explicit DTOs for create/update operations
- Update DTO fields must be optional
- Export interfaces/types that are used in controllers

### API Style
- REST endpoints only
- No GraphQL
- No WebSockets
- Use proper HTTP methods (GET, POST, PATCH, DELETE)
- Return consistent error responses

### Guards & Security
- Use `@Roles()` decorator for role-based access
- Use `@Public()` decorator for public endpoints
- Use `BarAccessGuard` for bar-specific access control
- Never hardcode role checks in services

### Forbidden
- No architecture refactoring without approval
- No global changes to app.module.ts unless requested
- No changes to existing working modules
- No business logic in controllers

---

## Frontend Rules (React + Vite)

### Stack
- Vite 7+
- React 19+
- TypeScript
- Telegram Mini App SDK

### Core Rules

1. **Component Structure**
   - Use functional components with hooks
   - Keep components small and focused
   - Extract reusable logic into custom hooks
   - One component per file

2. **File Organization**
   ```
   src/
   ├── components/     # Reusable UI components
   ├── pages/          # Page components
   ├── hooks/          # Custom React hooks
   ├── api/            # API functions
   ├── types/          # TypeScript types/interfaces
   ├── utils/          # Utility functions
   └── styles/         # CSS/styling files
   ```

3. **API Integration**
   - All API calls through `src/api.ts` or separate API files
   - Use `import.meta.env.VITE_API` for API URL
   - Handle errors properly with try/catch
   - Show user-friendly error messages

4. **State Management**
   - Use React hooks (useState, useEffect, useContext)
   - For complex state, consider Context API or Zustand
   - Avoid prop drilling (use Context if needed)

5. **Styling**
   - Use CSS modules or styled-components
   - Follow design system from Figma
   - Use consistent spacing, colors, typography
   - Make it responsive (mobile-first for Telegram Mini App)

6. **TypeScript**
   - Always type props, state, and functions
   - Use interfaces for component props
   - Avoid `any` type (use `unknown` if needed)
   - Export types from `types/` directory

7. **Telegram Integration**
   - Check `window.Telegram?.WebApp` before using
   - Use Telegram WebApp SDK for native features
   - Handle Telegram theme (light/dark mode)
   - Use Telegram colors from themeParams

### Forbidden
- No direct API calls outside API functions
- No inline styles (use CSS classes)
- No console.log in production code
- No hardcoded API URLs (use env variables)
- No mixing of business logic and UI logic

---

## General Project Rules

### Code Style
- **Prefer clarity over abstraction**
- **No overengineering**
- **Follow existing naming conventions**
- **Write self-documenting code**
- **Add comments only when necessary**

### Git Workflow
- Use descriptive commit messages
- Commit related changes together
- Test before committing
- Never commit `.env` files or secrets

### Error Handling
- Always handle errors gracefully
- Show user-friendly error messages
- Log errors for debugging
- Never expose sensitive information in errors

### Performance
- Optimize images and assets
- Use lazy loading for routes
- Minimize bundle size
- Cache API responses when appropriate

### Security
- Never commit secrets or API keys
- Validate all user inputs
- Use HTTPS in production
- Sanitize data before displaying

---

## Design System (Figma)

### Working with Figma Design

1. **Colors**
   - Extract color palette from Figma
   - Use CSS variables for colors
   - Support light/dark themes

2. **Typography**
   - Extract font families, sizes, weights
   - Create typography scale
   - Use consistent line heights

3. **Spacing**
   - Use consistent spacing scale (4px, 8px, 16px, etc.)
   - Extract margins and paddings from Figma
   - Use CSS variables for spacing

4. **Components**
   - Identify reusable components
   - Extract component specifications
   - Match Figma design exactly

5. **Layout**
   - Follow Figma grid system
   - Match breakpoints
   - Ensure responsive design

### How to Share Figma Data

**Option 1: Figma Dev Mode (Recommended)**
- Открой Dev Mode в Figma
- Выдели компонент/экран
- Скопируй CSS свойства из правой панели
- Скопируй спецификации (размеры, отступы, цвета)
- Экспортируй иконки и изображения

**Option 2: Figma Inspect**
- Используй панель Inspect для измерений
- Копируй CSS код
- Экспортируй design tokens

**Option 3: Manual Description (Самый простой)**
- Опиши компоненты и их свойства текстом
- Укажи цвета (hex/rgb)
- Укажи размеры шрифтов, отступы
- Приложи скриншоты с аннотациями

**Option 4: Figma Tokens Plugin**
- Установи плагин Figma Tokens
- Экспортируй токены как JSON
- Используй для автоматизации

---

## Communication

### When Implementing Features
1. **Understand requirements first** - ask questions if unclear
2. **Follow existing patterns** - don't reinvent the wheel
3. **Test thoroughly** - check all edge cases
4. **Document changes** - update README if needed

### When Unsure
- **Ask for clarification** - better to ask than guess
- **Propose solutions** - suggest alternatives
- **Show examples** - demonstrate approach
- **Do nothing** - if completely unsure, wait for guidance

---

## Quick Reference

### Backend
- Module pattern: `module.service.ts`, `module.controller.ts`, `module.module.ts`
- DTO pattern: `create-module.dto.ts`, `update-module.dto.ts`
- Use `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()` for Swagger

### Frontend
- Component pattern: `ComponentName.tsx`, `ComponentName.css`
- API pattern: functions in `api/` directory
- Hook pattern: `useHookName.ts` in `hooks/` directory

### Common
- Use TypeScript everywhere
- Follow ESLint rules
- Format code with Prettier
- Test before committing

---

**Remember:** When in doubt, ask. Better to clarify than to make assumptions.
