# Autenticación en el backend (JWT y seguridad)

## Servicios principales

### AuthService

Responsable de firmar/verificar JWT:

- Emite Access + Refresh.
- Verifica expiración y firma.
- En refresh, aplica **rotación** para invalidar el token anterior.

### AccountSecurityService

Operaciones sensibles:

- Verificación de email.
- Recuperación de contraseña.

Protección extra: los tokens enviados por email se guardan en BD como **hash SHA‑256** (si se filtra BD, no “sirven” los tokens).

## Decoradores y guards

- `@Public()`: ruta sin JWT (login/refresh/forgot-password…).
- `@Roles()`: restringe por rol.
- **ThrottlerGuard**: rate limit global y overrides en login/reset.

## Flujos

### Verificación de email

1. Genera token aleatorio.
2. Guarda hash + expiración en tabla.
3. Consume token al verificar y marca `email_verified_at`.

### Reset de contraseña

1. Solicitud por email.
2. Token temporal (hash en BD).
3. `bcrypt` para hashear nueva contraseña (mínimo 8 chars).

## Nota

Hemos puesto especial cuidado en evitar fugas de tokens (hash en BD) y en limitar intentos en endpoints sensibles.

