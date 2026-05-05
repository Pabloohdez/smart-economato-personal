# Política de seguridad — Smart Economato

Gracias por ayudar a mantener **Smart Economato** seguro.

## Versiones soportadas

Este proyecto se mantiene sobre la rama **`main`** (o **`master`**). Solo se atienden incidencias de seguridad reproducibles sobre la última versión disponible del repositorio.

## Cómo reportar una vulnerabilidad

Por favor **no abras un issue público** ni publiques detalles en Pull Requests.

Usa uno de estos canales:

1. **GitHub Security Advisories (recomendado)**  
   Ve a la pestaña **Security** del repositorio y utiliza **“Report a vulnerability”** para enviar el reporte de forma privada.

2. **Si no tienes acceso a Security Advisories**  
   Abre un issue **privado** (si el repositorio lo permite) o contacta al mantenedor del repositorio por el canal acordado en tu centro/equipo.

Incluye, si es posible:

- **Descripción** y **impacto** (qué se puede conseguir).
- **Pasos para reproducir** (lo más concretos posible).
- **Prueba de concepto** (PoC) mínima y segura, si aplica.
- **Versiones/entorno**: SO, navegador, versión de Node, etc.
- **Evidencias**: logs, capturas, requests/responses (sin credenciales).

## Tiempos de respuesta (objetivo)

- **Acuse de recibo**: 72 horas.
- **Evaluación inicial**: 7 días.
- **Mitigación / fix**: según severidad y complejidad.

> Estos tiempos son objetivos y pueden variar según la disponibilidad del equipo.

## Alcance

Dentro de alcance (ejemplos):

- Autenticación/autorización (roles, JWT, controles de acceso).
- Exposición de datos sensibles (PII, credenciales, tokens).
- Inyecciones (SQLi, XSS), SSRF, CSRF, path traversal, etc.
- Configuración insegura (CORS demasiado permisivo, headers, cookies).

Fuera de alcance (ejemplos):

- Problemas de tipo “best practices” sin impacto demostrable.
- Ataques que requieran acceso físico o credenciales comprometidas del usuario.
- Denegación de servicio por fuerza bruta sin límites razonables (si no hay explotación adicional).

## Buenas prácticas para investigadores

- Evita pruebas destructivas (borrados, saturación de recursos).
- No accedas ni descargues datos de otros usuarios.
- Usa cuentas de prueba cuando sea posible.
- Mantén el reporte **confidencial** hasta que exista una corrección y ventana de divulgación coordinada.

## Crédito

Si quieres aparecer en los créditos del proyecto tras la corrección, indícalo en el reporte (nombre/alias y enlace opcional).

