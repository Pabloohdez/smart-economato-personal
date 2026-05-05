# Esquema de base de datos (PostgreSQL + Supabase)

La base de datos es **PostgreSQL** (Supabase) y hemos gestionado el esquema desde el backend con **Drizzle ORM**.

## Tablas principales

### Usuarios y seguridad

- **`usuarios`**: datos de usuario, rol y estado (aprobación).
- **`refresh_tokens`**: tokens de refresh para rotación de sesión.

### Catálogo e inventario

- **`categorias`**: clasificación de productos.
- **`proveedores`**: entidades proveedoras.
- **`productos`**: registro central (stock actual, mínimos, relaciones).

### Compras y movimientos

- **`pedidos`**: cabecera del pedido (estado PENDIENTE/RECIBIDO/INCOMPLETO, total…).
- **`detalles_pedido`**: líneas del pedido (producto, cantidades pedidas/recibidas…).
- **`lotes_producto`**: lotes por caducidad/cantidad.
- **`movimientos`**: auditoría de cambios de stock (ENTRADA/SALIDA) con stock anterior/nuevo.
- **`bajas`**: pérdidas por caducidad, rotura, ajuste, etc.

### Analítica culinaria y seguridad alimentaria

- **`alergenos`**: catálogo de alérgenos.
- **`escandallos`**: recetas (metadatos + coste/pvp).
- **`escandallo_items`**: ingredientes/cantidades/precio de un escandallo.

## Precisión numérica

- Cantidades/stock: `numeric(14,3)` (para kg/l con milésimas).
- Precios: `numeric(10,2)` (euros).

## Concurrencia y consistencia

En operaciones de stock se usan bloqueos `FOR UPDATE` para evitar carreras y transacciones para evitar estados parciales.

## Nota

Hemos elegido tipos numéricos con precisión para evitar errores típicos en cantidades/pesos y dinero.

