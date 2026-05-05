# Compras y gestión de pedidos

Este módulo cubre el ciclo completo de aprovisionamiento: desde crear pedidos a proveedores hasta recibir mercancía y actualizar stock/lotes.

## Flujo de compras

1. **Borrador**: seleccionar productos y cantidades.
2. **Crear pedido**: persistir `pedidos` + `detalles_pedido`.
3. **Recepción**: conciliar cantidades recibidas y registrar lotes/caducidades.
4. **Actualizar inventario**: sumar stock y crear lotes de forma atómica.

## Entidades de datos (resumen)

- `pedidos`: cabecera (proveedor, total, estado).
- `detalles_pedido`: líneas.
- `lotes_producto`: se crean al recibir (caducidad/traceabilidad).

## Componentes clave

- Frontend: `PedidosPage` (creación + histórico)
- Backend: `PedidosService` (transacciones de “RECIBIR”)

## Nota

Hemos priorizado que el paso de “recibir” sea transaccional, porque es donde más se rompe la consistencia si algo falla.

