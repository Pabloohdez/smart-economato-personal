# Pedidos de compra — Frontend

## PedidosPage (contenedor)

`PedidosPage` alterna entre:

- **Lista**: histórico de pedidos.
- **Nuevo**: creación de pedido(s).

Se apoya en TanStack Query para cargar:

- pedidos
- proveedores
- productos

y usa animaciones con `framer-motion` para transiciones.

## Split multi‑proveedor

Si el usuario añade productos de distintos proveedores en una misma sesión, el frontend **agrupa por proveedor** y crea un pedido por proveedor al guardar.

## Normalización de unidades (punto clave)

Como los proveedores pueden vender en formatos distintos, el frontend convierte a unidades base:

- `normalizarUnidad(raw)` → `ud` / `kg` / `l`
- `unidadBaseDeProducto(prod)` → deduce la unidad base
- `factorAUnidadBase(unidad, base)` → multiplicador de conversión
- `stepDeUnidad(unidad)` → define incremento del input (1 vs 0.001)

## PedidosTable

Visualiza histórico con:

- filtro local (texto + estado)
- badges de estado
- export/import Excel mediante menú de acciones

## UiSelect

Dropdown basado en Radix:

- search interno si hay muchas opciones
- portal para evitar “clipping” por `overflow: hidden`

## Nota

Hemos hecho la normalización de unidades en frontend para evitar errores de stock por “kg vs g” o “ud vs packs”.

