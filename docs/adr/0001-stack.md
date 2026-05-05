# ADR-0001 — Selección de stack (NestJS + React + Supabase)

## Estado
Aceptado.

## Contexto
Se requiere una solución web full-stack con:
- UI moderna responsive
- API mantenible y tipada
- Seguridad (auth/roles) y validación
- Despliegue reproducible

## Decisión
- **Backend**: NestJS (TypeScript)
- **Frontend**: React + Vite + TypeScript
- **Base de datos**: PostgreSQL en Supabase (gestionado, SSL)
- **CI**: GitHub Actions
- **Infra dev/prod**: Docker Compose

## Alternativas consideradas
- Backend: Express “a mano”, Fastify, Laravel
- Frontend: Angular, Vue
- DB: Postgres local, MySQL, SQLite

## Criterios
- Productividad y estructura (módulos, DI, patrones)
- Tipado extremo a extremo
- Ecosistema (testing, tooling)
- Seguridad por defecto (pipes/guards/filtros)
- Reproducibilidad (Docker) y DB gestionada

## Consecuencias
- Mayor robustez y mantenibilidad.
- Curva de aprendizaje NestJS/TS.
- Dependencia de Supabase (mitigable con export/backup).

