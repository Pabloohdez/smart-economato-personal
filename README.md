# Smart Economato

**Frontend:** React + TypeScript (Vite)  
**Backend:** NestJS  
**Base de datos:** PostgreSQL en Supabase (remoto).  

**No se usa XAMPP, PHP ni Apache.** Todo corre en Docker; la base de datos está en Supabase.

---

## Con Docker (recomendado)

Todo está dockerizado: frontend (React) y backend (NestJS). Un solo punto de entrada.

Si tienes XAMPP u otro servidor en el puerto 8080, deténlo antes de levantar Docker (o cambia el puerto en `docker-compose.yml`).

```bash
docker-compose up --build
```

- **App:** [http://localhost:8081](http://localhost:8081) — React (el navegador llama a `/api`, nginx hace proxy al backend).
- **API:** el backend NestJS corre en el contenedor `api`; las peticiones llegan vía proxy desde el frontend.

Variables de entorno para Docker:

- Docker carga la configuración del backend desde `backend/.env`.
- Si no existe, copia `backend/.env.example` a `backend/.env` y rellena `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `ALLOWED_ORIGINS`, `JWT_SECRET` y `JWT_EXPIRES_IN`.

Verificación rápida de estado:

```bash
curl http://localhost:3000/api/health
```

---

## Sin Docker (desarrollo local)

1. **Backend (NestJS)** — puerto 3000:
   ```bash
   cd backend && npm install && npm run start:dev
   ```

2. **Frontend (React)** — puerto 8081 (desde la raíz o desde frontend):
   ```bash
   # Desde la raíz (recomendado): arranca la app React en 8080
   npm run dev

   # O desde frontend:
   cd frontend
   cp .env.example .env
   npm install && npm run dev
   ```
   Abrir **http://localhost:8081** — verás la app React+TypeScript (no la antigua).

---

## Base de datos

La base de datos está alojada en **Supabase** (PostgreSQL remoto). No es necesario instalar nada localmente.

La conexión se configura en `backend/.env` con las variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASS`.

Para revisión/entrega, se adjunta el export completo de la base de datos en `proyecto_completo.sql` (raíz del proyecto). Incluye esquema, tablas, relaciones, índices y políticas RLS de Supabase.

Para restaurar en una instancia PostgreSQL propia:

```bash
psql -h localhost -U postgres -d nombre_bd -f proyecto_completo.sql
```

---

## Credenciales de demo

| Rol           | Email                          | Contraseña   |
|---------------|--------------------------------|--------------|
| Administrador | admin@smarteconomato.local     | Admin1234!   |
| Profesor      | profesor@smarteconomato.local  | Profesor1!   |
| Alumno        | alumno@smarteconomato.local    | Alumno1234!  |

> Estas credenciales solo son válidas en el entorno de demo. No usar en producción.

---

## Estructura

- `frontend/` — React + TypeScript (Vite). Se sirve con nginx en Docker.
- `backend/` — NestJS. API REST, conexión a Supabase.
- `database/` — Esquema SQL y datos de ejemplo para restauración.
- Base de datos en **Supabase** (PostgreSQL remoto); no hay BD local, PHP ni XAMPP.

---

## Documentación (entrega / rúbrica)

- `docs/ANALISIS_ARQUITECTURA.md` — análisis técnico y mejoras
- `docs/API_DOCUMENTATION.md` — endpoints API
- `docs/EMAIL_SETUP.md` — configuración de email / recuperación
- `docs/TESTING_CI.md` — cómo ejecutar tests + qué valida CI
- `docs/DEPLOYMENT_HTTPS.md` — guía de despliegue y HTTPS
- `docs/MEMORIA_EVIDENCIAS.md` — memoria técnica (índice, evidencias, anexos)
- `docs/PLAN_PROYECTO.md` — planificación/hitos/gestión
- `docs/REFERENCIAS.md` — fuentes citadas
- `docs/DIAGRAMAS.md` — diagramas (Mermaid)
- `docs/adr/` — decisiones técnicas (ADRs)
