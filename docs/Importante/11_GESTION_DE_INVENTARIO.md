# Gestión de inventario

Hemos planteado el subsistema de inventario como el “núcleo” del sistema: catálogo de productos, estado de stock y caducidades por lotes.

## Concepto clave: producto vs lote

- **Producto**: define metadata (nombre, unidad, proveedor, stock mínimo, precio…).
- **Lote**: refleja la realidad física (cantidad + fecha de caducidad por entrada).

## Alertas y análisis

- **Stock bajo**: cuando \(stock \le stockMinimo\).
- **Caducidad**: cálculo de días restantes por lote y badges (“caducado”, “en 30 días”…).

## UI (alto nivel)

- Página `InventarioPage` coordina datos y filtros.
- Tabla `InventarioTable` gestiona edición inline y detalle de lotes.

## Nota

Nuestro objetivo es que el inventario sea útil en operativa real: rápido de consultar, fácil de filtrar y sin perder trazabilidad.

