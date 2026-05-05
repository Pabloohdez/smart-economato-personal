# Flujo de autenticación y registro (frontend)

## Vista general (cómo lo hemos planteado)

El frontend implementa el ciclo completo de autenticación:

- login
- solicitud de cuenta (registro)
- verificación de cuenta
- aprobación por admin
- recuperación de contraseña

## AuthContext y sesión

`AuthContext` es la “fuente de verdad” del usuario logueado:

- persiste tokens/usuario (normalmente vía `sessionService` + `localStorage`)
- expone helpers para actualizar usuario y cerrar sesión

## Páginas clave

- **LoginPage**: layout a dos columnas (branding + formulario), toggle de visibilidad de contraseña y estados de carga.
- **CrearUsuarioPage**: formulario de solicitud de acceso, validación de campos y normalización de email.
- **AdminApprovalPage**: listar solicitudes pendientes y permitir aprobar/rechazar:
  - `GET /usuarios/requests`
  - `POST /usuarios/:id/approve`
  - `DELETE /usuarios/:id/reject`
- **VerifyAccountPage**: consume token en URL o permite reenviar verificación.
- **ForgotPasswordPage / ResetPasswordPage**: recuperación.

## Rutas protegidas

`ProtectedRoute` bloquea rutas internas si no hay sesión válida.

## Nota

Hemos mantenido el mismo patrón visual en todas las pantallas de auth para que el usuario no se pierda.

