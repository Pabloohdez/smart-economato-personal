  # Tests y CI — Smart Economato

Este documento reúne **cómo ejecutar tests localmente** y qué valida el **pipeline de CI**.

## Frontend (Vitest)

Desde `frontend/`:

- Ejecutar tests:
  - `npm test`
- Modo watch:
  - `npm run test:watch`
- Cobertura:
  - `npm run test:coverage`
- Type-check:
  - `npm run type-check`
- Lint:
  - `npm run lint`

## Backend (Jest)

Desde `backend/`:

- Tests unitarios:
  - `npm test`
- Tests e2e:
  - `npm run test:e2e`
- Cobertura:
  - `npm run test:coverage`
- Type-check:
  - `npm run type-check`

## CI (GitHub Actions)

Workflow en `.github/workflows/ci.yml`:

- **Frontend**: `npm ci` → `lint` → `type-check` → `test` → `build`
- **Backend**: `npm ci` → `type-check` → `test` → `build`

> Nota: Los tests e2e del backend se ejecutan localmente con `npm run test:e2e`. Si se desea, se puede añadir un job adicional en CI para e2e.

