# Estructura del frontend (React SPA)

En esta sección describimos cómo hemos montado la SPA: arranque, providers globales, rutas y seguridad.

## Punto de entrada

- `main.tsx`: monta React (`createRoot`) y registra Service Worker.
- `App.tsx`: componente raíz con providers:
  - `QueryClientProvider` (TanStack Query)
  - `BrowserRouter` (react-router)
  - `AuthProvider` (sesión)

## Rutas

Rutas divididas en:

- **Públicas**: login/registro/verificación/recuperación.
- **Protegidas**: app interna (inventario, recepción, pedidos, etc.).

### Lazy loading

Se usan `React.lazy` + `Suspense` para cargar páginas secundarias bajo demanda (mejor primer render).

## ProtectedRoute

`ProtectedRoute` verifica si hay sesión activa (`hasActiveSession()`).

- Si no hay sesión: redirige a `/login`.
- Si hay sesión: renderiza el layout interno.

## Layout

`AppLayout`:

- Sidebar + header para páginas protegidas.
- Navegación filtrada por rol (roles normalizados).

## Manejo global de errores

`RouteErrorBoundary` envuelve el árbol de rutas:

- Se resetea al cambiar de path.
- Botón “Reintentar” para recuperación sin recargar.

## Nota

Hemos separado rutas públicas y protegidas para que la parte interna solo se pueda usar con sesión válida.

