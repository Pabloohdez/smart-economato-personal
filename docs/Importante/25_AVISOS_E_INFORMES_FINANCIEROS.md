# Avisos e informes financieros

Hemos diseñado `AvisosPage` como centro de control: muestra alertas de inventario y un resumen financiero para actuar rápido.

## Motor de alertas

### 1) Lotes caducados

Detecta:

- lotes reales en `lotes_producto` con `fechaCaducidad < hoy` y `cantidad > 0`
- lotes “virtuales” cuando el producto no usa lotes explícitos pero tiene caducidad global

Calcula **valor en riesgo** como \(cantidadCaducada \* precio\).

### 2) Stock bajo

Marca productos cuando \(stock \le stockMinimo\).

## Resolución desde la propia pantalla

### Bajas automáticas

Desde un lote caducado:

- registra baja
- consume el lote concreto
- invalida queries (productos/lotes/informes)

### Pedido por reposición

Desde stock bajo:

- sugiere cantidad: \((stockMinimo \* 2) - stockActual\)
- crea pedido (y sincroniza con otras pestañas)

## Informes financieros

Incluye:

- gastos mensuales por profesor (agregación desde backend)
- KPIs: valor total inventario, inversión en riesgo, eficiencia

## Nota

Hemos integrado acciones directas (pedido/baja) para que el usuario resuelva el problema desde la misma pantalla.

