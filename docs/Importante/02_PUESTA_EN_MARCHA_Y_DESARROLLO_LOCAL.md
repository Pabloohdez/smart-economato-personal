# Puesta en marcha y desarrollo local

En esta guía explicamos cómo ejecutamos el proyecto en local. El enfoque recomendado es **Docker**.

## Requisitos

- **Docker + Docker Compose**
- (Opcional) **Node.js** si ejecutas sin Docker
- **Supabase** (PostgreSQL remoto): no necesitas instalar BD local

## Variables de entorno

### Backend (`backend/.env`)

Se carga desde `backend/.env` (plantilla en `backend/.env.example`).

- Conexión BD Supabase: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
- Seguridad: `JWT_SECRET`
- CORS: `ALLOWED_ORIGINS`
- Mail: `MAIL_MODE` (por ejemplo `smtp` o `log`)

### Frontend (`frontend/.env`)

Plantilla: `frontend/.env.example`

- `VITE_API_URL`:  
  - Docker: `/api` (mismo origen, proxy por Nginx)  
  - Nativo: `localhost:3000/api`

## Infra Docker

Servicios típicos:

- `frontend` (Vite en dev)
- `api` (NestJS)
- `mailpit` (captura correos en local)

Modos:

- **Dev**: hot reload con volúmenes montados.
- **Prod**: build + Nginx sirviendo `dist`.

## Healthcheck

- Endpoint: `/api/health` (usado por Docker para dependencias).

## Mailpit (emails en local)

- SMTP: `1025`
- Web UI: `localhost:8025`

## Nota

Hemos preparado el proyecto para evitar stacks legacy (XAMPP/PHP/Apache) y estandarizar el entorno con Docker.

