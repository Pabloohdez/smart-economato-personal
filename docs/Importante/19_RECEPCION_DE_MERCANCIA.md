# Recepción de mercancía

Hemos diseñado la **recepción** como la principal entrada de stock al sistema.

## Workflows

1. **Recepción por pedido**: importar pedidos pendientes, verificar cantidades y asignar lotes (caducidad).
2. **Recepción manual**: entrada directa para artículos sin pedido formal.

## Estado y datos

- Estado “buffer” en UI para cantidades y lotes antes de enviar.
- Mutación principal: recepción del pedido (backend hace transacción).

## Integración con báscula (Web Serial)

Se integra con básculas físicas mediante Web Serial:

- `ScaleSerial`: parsea stream usando framing STX/ETX y extrae números (kg).
- `useScaleSerial`: hook React con `connect()` y `captureKg()`.
- Protocolo alineado con `SCPuerto.py`.

## Búsqueda y autocomplete

`useRecepcionSearch` implementa sugerencias tipo “ghost” filtrando por:

- proveedor
- categoría
- texto (nombre, código barras, marca, id)

## Confirmaciones

Usa `ConfirmDialogHost` / `showConfirm` (promesas) para acciones críticas.

## Nota

Hemos integrado la báscula para reducir errores humanos al introducir pesos (sobre todo en producto fresco).

