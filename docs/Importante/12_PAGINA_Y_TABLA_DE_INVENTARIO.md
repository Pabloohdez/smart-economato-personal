# Página y tabla de inventario

## Componentes principales

- **`InventarioPage`**: orquesta datos (productos + lotes) y aplica filtros/ordenación.
- **`InventarioTable`**: capa interactiva (badges, modales, edición, lotes, paginación).

## Datos y refresco

Se usa **TanStack Query** (react‑query):

- Productos: `getProductos`
- Lotes: `getLotesProducto`
- Polling: `refetchInterval` (≈ 45s) para mantener frescura multi‑cliente
- Listeners: `online` + `visibilitychange` para refetch al volver la conexión o enfocar pestaña

## Lógica de filtros (ejemplos)

- **Stock bajo**: `stock <= stockMinimo`
- **Caducidad**: normalización de fechas + threshold (30 días)
- **Escáner de código de barras**: integra `BarcodeDetector` (cámara) para volcar a la búsqueda

## Interacciones en tabla

- **Edición**: modal/mutation para `precio`, `stock`, `stockMinimo`, `unidadMedida`
- **Detalle lotes**: modal con caducidades/cantidades por lote
- **Borrado suave**: marca `activo: false`

## Exportación y paginación

- Exporta vista filtrada:
  - **CSV** (cadena + Blob)
  - **XLSX** (`xlsx` workbook)
- Paginación con scroll suave hacia arriba al cambiar de página

## Backend de lotes (resumen)

- `GET /lotes`: lotes con `cantidad > 0`
- `POST /lotes/batch`: inserción en transacción
- `POST /lotes/consumir`: descuenta lote con `FOR UPDATE`

## Nota

Hemos intentado que la tabla sea práctica: estados visuales claros, edición rápida y exportación para informes.

