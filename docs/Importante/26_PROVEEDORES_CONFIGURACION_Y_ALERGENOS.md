# Proveedores y configuración

En este bloque explicamos lo que hemos construido:

- gestión de **proveedores**
- **configuración** y preferencias por usuario
- subsistema de **alérgenos** (seguridad alimentaria)

## Proveedores (CRUD)

`ProveedoresPage`:

- listado paginado con filtros
- create/update/delete
- sincronización en tiempo real: invalidación + broadcast a pestañas

Backend:

- `GET /proveedores` y endpoints CRUD asociados.

## Configuración (preferencias)

`ConfiguracionPage` organiza la configuración en pestañas (por ejemplo):

- Perfil
- Alérgenos
- Notificaciones

Persistencia:

- parte en BD (perfil, alergias)
- parte en `localStorage` (preferencias por usuario, p. ej. bloqueo/avisos)

## Subsistema de alérgenos

### Catálogo

Backend mantiene una lista `DEFAULT_ALERGENOS` y la sincroniza con un **UPSERT** para asegurar que la tabla `alergenos` siempre contiene el catálogo esperado.

### Alergias del usuario

Se guardan en una tabla de relación (join):

- frontend: selección en `ConfiguracionPage`
- backend: actualización transaccional (borrar e insertar el set nuevo)

Esto impacta directamente en **Distribución** (avisar o bloquear productos por alérgenos).

## Nota

Hemos hecho que las preferencias del usuario impacten directamente en la operativa (por ejemplo, bloquear o avisar por alérgenos en distribución).

