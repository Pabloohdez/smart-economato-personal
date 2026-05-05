# Notificaciones y diálogos de confirmación

Hemos implementado dos subsistemas globales para dar feedback:

1. **Toasts** (notificaciones no bloqueantes)
2. **Confirmaciones** (decisiones críticas con promesas)

## 1) Toast notifications

Basadas en `sonner`, encapsuladas por `showNotification` con 4 estados:

- success
- error
- warning
- info

Incluye un fallback: `ensureUiOverlayStyles()` inyecta estilos mínimos en `<head>` para que el overlay siga funcionando aunque fallen estilos globales.

## 2) Confirmaciones promise‑based

En vez de `window.confirm`, se usa un patrón:

- `showConfirm(options)` devuelve `Promise<boolean>`
- `ConfirmDialogHost` mantiene una **cola** de diálogos
- al confirmar/cancelar, resuelve la promesa y elimina el diálogo

Detalles técnicos:

- render por `createPortal` a `document.body` (evita problemas de z-index/overflow)
- teclado: `Escape` cancela, `Enter` confirma (según foco)
- enfoque inicial en botones para accesibilidad

## 3) Uso especializado: alérgenos

`alergenosUtils` usa toasts/confirmaciones para avisar o bloquear distribución según preferencias del usuario.

## Nota

Hemos usado un patrón por promesas para confirmaciones porque nos permite escribir flujos asíncronos claros y sin estado local innecesario.

