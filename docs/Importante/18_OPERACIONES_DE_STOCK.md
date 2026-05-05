# Operaciones de stock

El módulo de operaciones de stock cubre la operativa diaria de almacén:

- **Recepción (ENTRADA)**: sube stock
- **Distribución (SALIDA)**: baja stock por consumo/destino
- **Bajas (BAJA)**: salidas por caducidad, rotura, ajustes, etc.

## Sincronización y auditoría

- Todas las operaciones usan `apiFetch`.
- Se registran para auditoría y se sincronizan con invalidaciones (SSE + broadcast a pestañas).

## Componentes relacionados

- `RecepcionPage`
- `DistribucionPage`
- `BajasPage`
- `ConfirmDialogHost` (confirmaciones promise‑based globales)

## Nota

Hemos separado claramente ENTRADA/SALIDA/BAJA para que el histórico y la auditoría sean fáciles de interpretar.

