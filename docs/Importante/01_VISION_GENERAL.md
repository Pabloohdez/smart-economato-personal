# Smart Economato — Visión general del proyecto

## Qué es este proyecto

En **Smart Economato** hemos construido un sistema full‑stack para gestionar inventario, compras/pedidos, recepción, distribución, bajas y analítica (rendimiento/escandallos/avisos) en un entorno de economato (centros educativos culinarios).

## Roles de uso que hemos contemplado

- **Administradores**: control total (gestión, aprobaciones, acciones críticas).
- **Profesores**: operativa diaria (recepción, distribución, pedidos, bajas).
- **Estudiantes**: consulta y análisis (inventario, coste de recetas, rendimiento).

## Arquitectura (resumen) que hemos implementado

- **Frontend**: React + TypeScript (Vite) + Tailwind.
- **Backend**: NestJS (API REST).
- **BD**: PostgreSQL en Supabase.
- **Infra**: Docker + Nginx (reverse proxy).

## Módulos funcionales que hemos desarrollado

- **Autenticación y usuarios**: JWT, registro con verificación/aprobación.
- **Inventario**: stock + lotes con caducidad y alertas.
- **Compras**: pedidos a proveedores y recepción.
- **Operaciones**: distribución/salidas y bajas.
- **Analítica**: rendimiento, escandallos, avisos e informes.

## Nota

Hemos priorizado una arquitectura modular y tipada para mantener el sistema mantenible y consistente.

