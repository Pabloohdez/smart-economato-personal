# Configuracion de correo

El flujo de verificacion de cuenta y recuperacion de contrasena ya esta implementado.

Mientras no haya cuenta SMTP disponible, el backend puede funcionar en modo local con:

```env
MAIL_MODE=log
```

En ese modo, no se envia ningun correo real. El backend escribe en consola el destinatario, el asunto y el enlace generado. Asi puedes probar:

- registro y verificacion de cuenta
- reenvio de verificacion
- recuperacion de contrasena
- restablecimiento por token

Cuando ya tengas la cuenta de correo, solo hace falta cambiar a:

```env
MAIL_MODE=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Smart Economato <no-reply@tu-dominio.com>
APP_FRONTEND_URL=http://localhost:8081
VERIFY_EMAIL_EXPIRES_HOURS=24
PASSWORD_RESET_EXPIRES_MINUTES=60
```

No hace falta tocar codigo. Solo actualizar las variables de entorno y reiniciar backend.