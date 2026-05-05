# Componentes reutilizables de UI

Hemos creado una librería de componentes compartidos en el frontend para mantener consistencia.

## Primitivas

- **Button**: variantes (primary/secondary/success/danger/ghost) + estado `loading`.
- **Badge**: estados (success/warning/destructive…).
- **Card**: contenedor estándar.
- **Input / SearchInput**: inputs consistentes; `SearchInput` incluye icono y padding de toolbar.

## Layouts

- **BackofficeTablePanel**: contenedor estándar para páginas con tabla (header/children/footer).
- **Table primitives**: `Table`, `TableRow`, `TableHead`, etc. con estilos comunes.

## Feedback

- **Alert**: info/warning/success/error.
- **Spinner / Skeleton**: loading.
- **EmptyState**: estado vacío con CTA opcional.

## Navegación y paginación

- **TablePagination**:
  - genera items de página (con “dots” si hace falta)
  - scroll suave al cambiar de página
  - selector de tamaño de página con `UiSelect`

## Controles complejos

- `UiSelect` y `ToolbarFilterDropdown`
- `ConfirmDialogHost` (confirmaciones globales por promesas)

## Nota

Hemos preferido componentes reutilizables para reducir duplicación y acelerar el desarrollo de páginas nuevas.

