# Análisis de rendimiento (merma)

Hemos creado el módulo de **Rendimiento** para medir la eficiencia al procesar ingredientes: compara **peso bruto** vs **peso neto** y calcula desperdicio/merma.

## Patrón de uso (buffer de sesión)

El usuario puede añadir varios registros a un estado local (`registrosRendimiento`) y luego guardarlos en batch.

## Fórmulas principales

- **Desperdicio** = \(PesoBruto - PesoNeto\)
- **Rendimiento (%)** = \((PesoNeto / PesoBruto) \* 100\)
- **Merma (%)** = \((Desperdicio / PesoBruto) \* 100\)

## Báscula y offline

- Captura de pesos con `useScaleSerial`.
- Guardado con soporte offline: si no hay red, se encola y se sincroniza al volver conexión.

## Historial e informes

- Consulta de historial con filtros.
- Borrado de registros (admin) vía `DELETE /rendimientos/:id`.
- Sub‑sistema de impresión: estilos especiales al imprimir.

## Sincronización

Al guardar o borrar:

- invalidación local de queries
- broadcast a otras pestañas
- eventos SSE desde backend (realtime)

## Nota

Hemos incluido soporte offline porque este flujo se usa en cocina/almacén, donde la conexión puede fallar.

