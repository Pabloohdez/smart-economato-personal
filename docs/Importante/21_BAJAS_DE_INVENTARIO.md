# Bajas de inventario

Hemos diseñado las **bajas** para gestionar retiradas de stock por motivos no “consumo normal”: caducidad, rotura, merma o ajuste.

## Dos puntos de entrada

1. **Manual** (`BajasPage`): bajas ad‑hoc.
2. **Desde avisos** (`AvisosPage`): bajas sugeridas por lotes caducados/valor en riesgo.

## Consistencia (producto + lote)

Para que el sistema cuadre:

- baja descuenta **stock** del producto
- y además consume **cantidad del lote** concreto (si aplica)

## Tipos / motivos

- Rotura
- Caducado
- Merma
- Ajuste

## UX: control de cantidad (mantener pulsado)

En modales, los botones +/- implementan “hold‑to‑increment” para subir/bajar cantidades rápido en móvil.

## Sincronización

Al completar una baja se invalidan queries relevantes (productos, lotes, informes) para refrescar toda la app.

## Nota

Hemos conectado las bajas con lotes para que, al dar de baja, desaparezca también la cantidad del lote y no se quede “fantasma”.

