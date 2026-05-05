# Barra de herramientas y filtros del inventario

## Objetivo (por qué lo hice así)

`InventarioToolbar` es el “centro de control” del inventario:

- búsqueda
- filtros por categoría y proveedor
- toggles de stock bajo / caducidad
- ordenación
- acciones (exportar, limpiar, crear producto)

## Arquitectura

La toolbar **no guarda estado “de verdad”**: recibe props y actualiza estado que vive en `InventarioPage`. Así, filtros, tabla y queries permanecen sincronizados.

## Elementos clave

- **Búsqueda**: actualiza `q`.
- **Filtros**: `ToolbarFilterDropdown` para `catId` y `provId`.
- **Toggles stock/caducidad**: modo unificado (mutuamente excluyentes).
- **Acciones**:
  - exportar CSV/XLSX (callbacks)
  - limpiar filtros
  - crear producto

## ToolbarFilterDropdown (reutilizable)

Componente genérico basado en `<details>/<summary>`:

- búsqueda interna opcional
- cierre por click fuera y `Escape`
- estilo “active” cuando el valor no es el default

## Nota

Hemos separado filtros (estado) de la tabla para que todo esté sincronizado y la UI sea más predecible.

