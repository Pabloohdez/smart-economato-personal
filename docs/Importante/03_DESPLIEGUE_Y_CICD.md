# Despliegue y CI/CD

## CI (GitHub Actions)

El pipeline valida calidad y estabilidad en cada `push` y `pull_request`, con dos jobs paralelos:

### Frontend

- `npm run lint`
- `npm run type-check`
- `npm run test` (Vitest) + coverage
- `npm run build` (Vite)

### Backend

- `npm run type-check`
- `npm test` (Jest) + coverage
- `npm run build`
- `npm run test:e2e`

## Dockerización

### Backend (NestJS)

- Multi-stage: `deps` → `builder` → `production`
- Runtime ejecuta `node dist/src/main.js`

### Frontend (React)

- Build con Vite
- Nginx sirve `dist`
- `VITE_API_URL` se inyecta en build (por defecto `/api`)

## Nginx (reverse proxy)

- SPA routing: `try_files ... /index.html`
- Proxy API: `/api` → contenedor `api:3000`
- Reduce problemas CORS al servir todo desde el mismo origen

## HTTPS en producción

Se recomienda terminar TLS fuera del compose:

- **Caddy** (Let’s Encrypt automático) o
- Nginx + Certbot en el host

## Nota

Hemos montado el flujo para “construir una vez y ejecutar en cualquier sitio” gracias a builds multi-stage y validación automática en CI.

