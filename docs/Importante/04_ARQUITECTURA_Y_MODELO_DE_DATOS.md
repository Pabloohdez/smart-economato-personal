# Arquitectura y modelo de datos

## Arquitectura full‑stack que hemos diseñado

Sistema desacoplado en 3 capas:

- **Cliente**: React SPA (UI + lógica de presentación)
- **API**: NestJS (seguridad + lógica de negocio)
- **Persistencia**: PostgreSQL (Supabase) con tipado mediante Drizzle

## Backend (NestJS + Drizzle) que hemos montado

- Arquitectura modular por dominios.
- Seguridad global: guard JWT y limitación de tasa (rate limit).
- Respuestas consistentes: `ApiEnvelope` (éxito/datos/error).

## Frontend (React) que hemos construido

- **TanStack Query** para estado de servidor (caché + invalidaciones).
- **apiFetch** como cliente central: JWT, refresh/rotación y cola offline.
- Sincronización: SSE + BroadcastChannel (ver `27_REALTIME_OFFLINE_SERVICE_WORKER.md`).

## Modelo de datos (idea clave) que seguimos

Separación entre:

- **Producto**: catálogo + stock agregado.
- **Lote**: cantidad por lote + caducidad (realidad física del almacén).

## Integridad transaccional (por qué la hemos aplicado)

Operaciones críticas se ejecutan con transacciones:

- Recepción de pedidos: estado pedido + sumas de stock + lotes.
- Movimientos: bloqueos `FOR UPDATE` para evitar carreras.
- Bajas: validación de stock suficiente y descuento atómico.

## Nota

Nuestro objetivo aquí ha sido garantizar consistencia del stock y trazabilidad (lotes) sin complicar la UI.

