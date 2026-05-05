# Pruebas

La estrategia de pruebas que hemos seguido se parece a una “pirámide”:

- unit tests (muchos, rápidos)
- e2e tests (menos, críticos)
- harness manual (para comprobaciones y estrés)

## Frontend (Vitest)

- Runner: **Vitest** con `jsdom`.
- Enfoque: testear lógica core (servicios/lib) más que UI.
- Cobertura: umbrales mínimos en archivos clave (apiClient/auth/realtime/offline/SW).
- Mocks: `BroadcastChannel`, `EventSource`, `caches`, etc.

Suites destacadas:

- `realtimeSync.test.ts`
- `apiClient.core.test.ts`
- `serviceWorker.test.ts`
- `offlineQueue.test.ts`

## Backend (Jest)

### Unit

Servicios y filtros (p. ej. `AllExceptionsFilter`, `LoginService`, `AuthService`).

### E2E

Suite de auth (refresh/rotación/expiración) para validar contratos request/response.

## CI

Los tests se ejecutan en GitHub Actions en cada push/PR (ver `03_DEPLOYMENT_CICD.md`).

## Harness manual (`tests/`)

- `tests/test_api.html`: estrés y validación de API (concurrencia configurable).
- `tests/test_errors.html`: previsualiza páginas de error (400/401/403/404/500/503).

## Comandos (referencia)

- Frontend: `npm test`, `npm run test:coverage`
- Backend: `npm test`, `npm run test:e2e`

## Nota

Hemos hecho que CI ejecute todo lo importante automáticamente para evitar regressions antes de entregar o desplegar.

