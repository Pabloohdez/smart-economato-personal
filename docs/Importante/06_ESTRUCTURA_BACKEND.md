# Estructura del backend (NestJS)

Hemos construido el backend con **NestJS** y lo hemos organizado en **módulos** por dominio (separación de responsabilidades).

## AppModule (orquestación)

`AppModule` importa módulos funcionales y registra providers globales:

- **Rate limiting** (Throttler).
- **JWT guard global** (todo protegido por defecto, salvo `@Public()`).
- **ThrottlerGuard** global para ataques por fuerza bruta/DoS.

## Infra común

- **DatabaseModule**: expone `DatabaseService` y acceso ORM/SQL.
- **RealtimeModule**: permite publicar invalidaciones a clientes (SSE).

## Ciclo de request

- **ResponseInterceptor**: envuelve respuestas en un formato estándar (`success`, `data`).
- **AllExceptionsFilter**: normaliza errores (4xx/5xx) y logging.

## Patrón Controller → Service

Ejemplos:

- **Productos**: lectura pública, escritura restringida (roles admin).
- **Pedidos**: al cambiar estado (p. ej. recibir), publica invalidaciones de queries (pedidos/productos…).

## Nota

Hemos intentado que cada módulo sea fácil de mantener: controller para endpoints y service para la lógica.

