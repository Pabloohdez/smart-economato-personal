# Analítica e informes

Hemos creado el módulo de analítica para convertir datos de inventario en métricas e información accionable.

## Submódulos

- **Rendimiento**: desperdicio/merma al procesar materias primas (bruto vs neto).
- **Escandallos**: coste de recetas y márgenes (coste total, beneficio, margen).
- **Avisos**: centro de alertas (caducidad/stock bajo) e informes financieros.

## Características transversales

- Cálculos en tiempo real en frontend.
- Persistencia histórica (cuando aplica).
- Integración con báscula en módulos de peso.
- Soporte offline en operaciones críticas (cola offline).

## Nota

Hemos buscado que estos módulos no sean “solo números”: que sirvan para decidir rápido (comprar, dar de baja, ajustar recetas).

