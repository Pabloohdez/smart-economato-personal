# Sistema de diseño y componentes UI

Hemos construido la UI sobre un **sistema de diseño** propio orientado a backoffice: consistencia, accesibilidad y claridad en tablas/formularios.

## Tokens y estilo base

- Tokens en CSS variables (`:root`) para colores, radios, sombras, etc.
- Tipografía base: Poppins.
- Color de marca principal (rojo) usado en acciones primarias y estados críticos.

## Clases globales “bo-”

En `index.css` se definen clases que encapsulan patrones de Tailwind:

- inputs/selects: `.bo-input`, `.bo-select`
- toolbars: `.bo-toolbar-primary`, `.bo-toolbar-secondary`, etc.
- tablas: `.bo-table-row`

Esto reduce duplicación y mantiene consistencia entre páginas.

## Sistemas de interacción (overlay)

Incluye subsistemas globales:

- **Toasts** (notificaciones)
- **Confirmaciones** (diálogos promise‑based)

## Impresión

Hay estilos específicos para reportes imprimibles (p. ej. rendimiento).

## Nota

Hemos centralizado tokens y clases globales para que el estilo sea consistente en todas las páginas.

