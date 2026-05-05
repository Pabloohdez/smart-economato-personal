# Escandallos (coste de recetas)

Hemos creado los **escandallos** para calcular el coste de una receta y su rentabilidad usando el catálogo de productos (precios actuales).

## Modelo de datos

- **Escandallo**: receta (nombre, PVP, elaboración, coste).
- **EscandalloItem**: ingrediente (producto, cantidad, precio usado en el cálculo).

## Cálculos en tiempo real

- **Coste total**: suma de \(cantidad \* precio\).
- **Beneficio neto**: \(PVP - costeTotal\).
- **Margen (%)**: \((beneficioNeto / PVP) \* 100\).

## Motor de sugerencias de ingredientes

Filtra productos por texto y muestra sugerencias al escribir (mínimo de caracteres).

Incluye un caso especial: si no existe “Sal” en BD, se inyecta un producto virtual para poder incluirla en la receta.

## UI y modales

Separación de modos:

- **Detalle** (solo lectura)
- **Editor** (crear/editar, añadir/quitar ingredientes y guardar)

## Service layer (CRUD)

`escandallosService`:

- listar
- guardar (crear/actualizar)
- borrar

Incluye integración con cola offline (cuando aplica) y sincronización por invalidación de queries.

## Nota

Hemos añadido indicadores visuales para que se vea rápido si una receta tiene margen sano o peligroso.

