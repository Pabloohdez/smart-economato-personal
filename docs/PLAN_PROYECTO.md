# Planificación y gestión — Smart Economato

Este documento sirve como evidencia de **plan**, **hitos**, **seguimiento** y **gestión de recursos** (rúbrica, criterio c).

## Hitos (entregables)

| Hito | Entregable | Evidencia sugerida |
|------|------------|-------------------|
| H1 | Requisitos y alcance | sección 2 de `docs/MEMORIA_EVIDENCIAS.md` |
| H2 | Arquitectura y stack | `docs/ANALISIS_ARQUITECTURA.md`, `docs/adr/` |
| H3 | Backend API base + auth | `backend/README.md`, endpoints, tests |
| H4 | Frontend UI + responsive | capturas (anexo A1) |
| H5 | Flujos principales (inventario, pedidos→recepción, bajas) | vídeo demo + capturas |
| H6 | Alertas/avisos + auditoría | capturas + endpoints |
| H7 | Calidad (tests + coverage + CI verde) | CI, `docs/TESTING_CI.md` |
| H8 | Despliegue reproducible + HTTPS documentado | `docker-compose.yml`, `docs/DEPLOYMENT_HTTPS.md` |

## Kanban (estado)

- **Backlog**: mejoras futuras (ver sección 13 de la memoria)
- **En progreso**: tareas activas de la iteración actual
- **Hecho**: funcionalidades entregadas y validadas

> Si no se ha usado herramienta Kanban externa, este documento hace de “registro mínimo” con evidencias.

## Gestión de recursos (herramientas / entorno)

- Repositorio Git, ramas, PRs (si aplica)
- CI con GitHub Actions
- Docker Compose para entorno reproducible
- Supabase como DB gestionada (SSL)

## Riesgos y mitigaciones (resumen)

- **Secretos**: nunca commitear `.env`; rotación de `JWT_SECRET`.
- **Dependencias**: auditoría periódica (npm audit).
- **Concurrencia/stock**: usar transacciones en operaciones críticas (plan de mejora).

