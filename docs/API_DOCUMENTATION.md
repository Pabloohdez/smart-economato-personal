# Especificación Técnica de API - Smart Economato

## 1. Visión General del Sistema

La API está implementada con **NestJS** (carpeta `backend/`). La base de datos es **PostgreSQL en Supabase**; no se usa base de datos local.

- **Base URL:** `http://localhost:3000/api` (o la que exponga el contenedor Docker).
- **Formato:** JSON (`application/json`), UTF-8.
- **CORS:** Habilitado para origen `*`.

---

## 2. Referencia de Endpoints

| Recurso | Métodos | Descripción |
|--------|---------|-------------|
| `/login` | POST | Autenticación (username, password). Devuelve usuario sin contraseña. |
| `/usuarios` | GET (?id=), POST | Obtener usuario por id; crear usuario. |
| `/categorias` | GET, POST | Listar y crear categorías. |
| `/proveedores` | GET, POST, PUT /:id, DELETE /:id | CRUD proveedores. |
| `/productos` | GET, POST, PUT /:id | CRUD productos. |
| `/pedidos` | GET, GET /:id, POST, PUT /:id | Pedidos y detalles; crear; RECIBIR/CANCELAR. |
| `/bajas` | GET (?mes=, ?anio=), POST | Listar y registrar bajas. |
| `/movimientos` | GET, POST | Listar y crear movimientos de stock. |
| `/auditoria` | GET (admin), POST | Consultar/registrar auditoría. |
| `/informes` | GET (?tipo=dashboard\|gastos_mensuales\|usuarios) | Dashboard e informes. |
| `/rendimientos` | GET (?limit=), POST, DELETE /:id | Análisis de rendimientos. |

Las respuestas exitosas siguen el formato `{ "success": true, "data": ... }`. Los errores: `{ "success": false, "error": { "message": "...", "code": número } }`.

---

## 3. Implementación

- **Backend:** NestJS en `backend/`. Conexión a Supabase vía variables de entorno (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS).
- **Config para herramientas PHP:** En `tools/config.php` (scripts de comprobación de esquema, instalación de tablas, etc.) se usa la misma conexión Supabase; la API principal es siempre el backend NestJS.

---

## 4. Ejecución con Docker

- **Servicio `api`:** Backend NestJS, puerto 3000.
- **Servicio `app`:** Frontend (Apache sirve la app estática), puerto 8080.

El frontend debe llamar a la API en `http://localhost:3000/api` (o la URL que corresponda si se usa otro host/puerto).
