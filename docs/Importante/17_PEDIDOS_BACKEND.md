# Pedidos de compra — Servicio del backend

`PedidosService` gestiona el ciclo de vida de los pedidos y la recepción (operación más crítica).

## Recuperación eficiente (json_agg)

Para listar pedidos con sus líneas, se usa una única query con `json_agg`/`json_build_object` para devolver items anidados desde PostgreSQL (evita múltiples queries).

## Flexibilidad de esquema

Incluye detección `supportsUnidadColumn` para soportar variantes del esquema (columna `unidad` en `detalles_pedido`), con valores fallback (`'ud'`) si falta.

## Creación de pedido

La creación se ejecuta en transacción:

1. Inserta cabecera en `pedidos`
2. Inserta líneas en `detalles_pedido`

Incluye lógica de fallback si `usuarioId` no es válido (evita FK).

## Operación “RECIBIR” (transacción)

Flujo dentro de una transacción:

1. Asegura que existe tabla `lotes_producto` (si aplica)
2. Valida items recibidos
3. Inserta lotes (caducidad) si vienen en payload
4. Incrementa `productos.stock` según `cantidad_recibida`
5. Actualiza estado del pedido a `RECIBIDO` o `INCOMPLETO`

## Concurrencia y consistencia

Patrones compartidos con bajas/lotes:

- `FOR UPDATE` para bloquear filas en cambios de stock
- transacción para evitar estados parciales

## Nota

Hemos diseñado el “RECIBIR” como una transacción porque ahí se actualizan varias tablas y no podemos permitir estados a medias.

