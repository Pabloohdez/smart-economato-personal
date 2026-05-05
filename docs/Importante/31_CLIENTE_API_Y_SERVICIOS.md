# Cliente API y capa de servicios

Hemos centralizado la comunicación frontend↔backend en un cliente robusto con:

- inyección de JWT
- refresh/rotación de tokens
- timeouts
- parsing uniforme de errores
- cola offline para mutaciones críticas

## `apiFetch` (cliente base)

Características:

- Base URL por `VITE_API_URL` (default `/api`)
- Headers automáticos (JSON + Authorization)
- Timeout (abort signal) para evitar requests colgadas
- Extracción de mensaje de error desde `ApiEnvelope`

## Refresh token (silencioso)

- Control de concurrencia: si varias requests fallan con 401, solo una lanza refresh.
- Si refresh falla: limpia sesión y redirige a login.

## Offline queue

Si no hay red y la request lo permite:

- encola request (path/method/body) en `localStorage`
- devuelve respuesta optimista (`queued: true`)
- al volver red: `flushOfflineQueue` reintenta

## Servicios por dominio

Se organizan API calls por módulos (ejemplos):

- `productosService`
- `pedidosService`
- `authService`

Ventajas:

- tipado estable
- sanitización de payloads (el backend es estricto con DTOs)
- unifica comportamiento offline/errores

## Nota

Hemos hecho esta capa para que las páginas solo “pidan datos” y no repliquen lógica de tokens, timeouts, errores u offline.

