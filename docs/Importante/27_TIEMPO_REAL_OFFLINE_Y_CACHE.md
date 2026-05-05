# Sincronización en tiempo real, modo offline y caché del navegador

Hemos montado el sistema para mantener consistencia entre usuarios/pestañas y tolerar conectividad irregular.

## Sincronización en tiempo real

### SSE (Server‑Sent Events)

Backend expone un stream (`/realtime/stream`) que publica eventos de invalidación (por `queryKeys`).

### BroadcastChannel (cross‑tab)

En el navegador, un canal (p. ej. `smart_economato_sync`) permite que una pestaña avise a otra para invalidar queries y refrescar datos sin recargar.

## Cola offline

Para mutaciones críticas:

- si `navigator.onLine` es falso, se encola request (path/method/body) en `localStorage`
- al recuperar red, se hace `flushOfflineQueue` y se reintenta

Esto permite operar (p. ej. rendimiento o batch de productos) en entornos con Wi‑Fi inestable.

## QueryClient (TanStack Query)

Configuración típica:

- `staleTime` corto (≈ 30s)
- reintentos con backoff
- refetch en focus/reconnect

## Service Worker

`sw.js` implementa:

- cacheo del “app shell”
- *network-first* para `/api` con fallback a caché
- *stale-while-revalidate* para assets
- en dev, se desregistra y limpia cachés para no romper HMR

## Nota

Hemos combinado SSE + BroadcastChannel + cola offline para que la app sea fiable incluso con red inestable.

