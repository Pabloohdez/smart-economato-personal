# Autenticación y gestión de usuarios

Hemos implementado autenticación y autorización pensadas para uso interno (no “registro libre”).

## Estrategia de tokens

- **Access token (JWT)**: corto, se manda en `Authorization: Bearer ...`.
- **Refresh token**: largo, se usa para renovar sesión sin volver a loguearse.
- **Rotación de refresh token**: cada refresh entrega uno nuevo e invalida el anterior (protección anti‑replay).

## Registro y aprobación por admin

Flujo típico:

1. El usuario solicita acceso (registro).
2. Verifica email.
3. Un **administrador aprueba** la cuenta antes de permitir login.

## Recuperación de cuenta

Incluye:

- “Olvidé la contraseña” (token temporal)
- “Reset password”

## Seguridad adicional

- Rate limiting (anti fuerza bruta) en endpoints sensibles.

## Nota

Hemos diseñado el registro como “solicitud de acceso” para tener control administrativo en un entorno educativo.

