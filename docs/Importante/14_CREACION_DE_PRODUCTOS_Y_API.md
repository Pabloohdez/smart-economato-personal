# Creación de productos y API de productos (backend)

## Visión general del ciclo de vida

La creación de productos soporta:

- Alta individual
- Alta por lotes (batch)
- Importación desde CSV/XLSX

El backend valida con DTOs y ejecuta operaciones batch en transacción.

## Frontend: `IngresarProductoPage`

Patrón “lista temporal”:

- El usuario prepara una `listaTemporal` de productos.
- Puede importar CSV/XLSX y normalizar cabeceras.
- Resuelve nombres de categoría/proveedor → IDs.
- Al confirmar, usa `crearProductosBatch` y luego invalida queries (y broadcast a otras pestañas).

## Backend: `ProductosController` / `ProductosService`

- **DTO** (`CreateProductoDto`): tipado y validación (precio/stock numéricos, opcionales…).
- Endpoints:
  - `POST /productos` (admin)
  - `POST /productos/batch` (hasta 100 en transacción)
  - `GET /productos/stock-bajo-count`
  - `GET /productos/avisos/alerts-count`
- `ProductosService`:
  - genera ID si falta
  - batch atómico con `db.transaction`
  - sincroniza alérgenos por producto (borrado + inserción del set actual)

## Frontend: `productosService.ts`

Abstrae `apiFetch` y:

- “desenvuelve” `ApiEnvelope`
- usa `offlineQueue` en operaciones críticas (batch, bajas…)
- tiene creación mínima (`crearProductoMinimo`) para permitir pedir algo que aún no existe completo

## Nota

Hemos creado este flujo para que se pueda dar de alta inventario rápido (incluso por importación) sin perder validación ni consistencia.

