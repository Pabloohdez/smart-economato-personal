# Manual de uso de la aplicación web (Smart Economato)

Este manual explica **cómo usamos** la aplicación en el día a día: qué hace cada pantalla, qué botones tocar y qué flujo seguir según la tarea.

---

## 1) Antes de empezar

### Acceso y roles

Según el rol, vemos más o menos secciones en el menú:

- **Administrador/a**: acceso completo (aprobaciones, altas, acciones sensibles).
- **Profesor/a**: operativa diaria (recepción, distribución, pedidos, bajas, inventario).
- **Alumno/a**: consulta y analítica (inventario, rendimiento, escandallos, etc., según permisos).

### Reglas rápidas que seguimos

- **Inventario** es la fuente principal de verdad del stock total.
- Si trabajamos con **lotes**, la caducidad se controla por lote (no solo por producto).
- Para evitar errores, en operaciones críticas aparece una **confirmación** antes de ejecutar.

---

## 2) Navegación básica

- La **barra lateral** contiene todas las secciones.
- En cada página, arriba solemos tener:
  - un **título** (sección actual)
  - una **barra de herramientas** (buscar, filtrar, exportar, acciones)
  - el **panel** con tabla o tarjetas de información

---

## 3) Inventario

### Qué hacemos aquí

En Inventario:

- consultamos stock y precios
- detectamos stock bajo / caducidades
- editamos datos básicos del producto
- vemos lotes (si existen)
- exportamos listados

### Buscar y filtrar

- **Buscar**: usamos el cuadro de búsqueda por nombre (y, si aplica, por código).
- **Filtrar por familia/categoría** y **proveedor**: usamos los desplegables.
- **Stock bajo / próximo a caducar**: activamos el filtro correspondiente.

### Editar un producto

1. Localizamos el producto en la tabla.
2. Abrimos la edición (normalmente desde un botón/acción de fila).
3. Ajustamos:
   - precio
   - stock
   - stock mínimo
   - unidad de medida
4. Guardamos y verificamos que el estado (badge) se actualiza.

### Ver lotes

1. En el producto, abrimos “ver lotes”.
2. Revisamos cantidad y caducidad por lote.
3. Si un lote está caducado o cercano, lo veremos reflejado también en Avisos.

### Exportar inventario

Desde “Acciones”:

- Exportamos a **CSV** o **Excel** según necesitemos.

---

## 4) Crear productos (altas)

### Alta individual o por lotes

En “Ingresar producto” (o pantalla equivalente):

- Podemos añadir productos uno por uno.
- O preparar una lista y guardarla en bloque (batch).

### Importación (CSV / Excel)

1. Seleccionamos el archivo.
2. Revisamos que columnas como **familia/categoría** y **proveedor** se resuelven bien.
3. Confirmamos el guardado.
4. Volvemos a Inventario para validar que aparecen.

---

## 5) Pedidos (compras)

### Crear pedido

1. Entramos en Pedidos y cambiamos a la vista “Nuevo”.
2. Seleccionamos proveedor (si aplica) y buscamos productos.
3. Añadimos productos con cantidades y unidades.

### Importante: unidades

Si un proveedor vende en gramos y nosotros gestionamos en kg, el sistema normaliza para evitar errores de stock.

### Guardar

Al guardar:

- Si hemos añadido productos de distintos proveedores en la misma sesión, el sistema **separa automáticamente** en pedidos distintos por proveedor.

### Histórico

En la vista de lista:

- filtramos por estado (pendiente, recibido, incompleto)
- buscamos por proveedor o identificador

---

## 6) Recepción (entrada de mercancía)

### Dos formas de recibir

1. **Recepción desde pedido pendiente**:
   - importamos el pedido
   - verificamos cantidades recibidas
   - registramos lotes/caducidades si corresponde
2. **Recepción manual**:
   - buscamos el producto
   - añadimos cantidad recibida
   - confirmamos la entrada

### Báscula (si la usamos)

- Conectamos la báscula.
- Capturamos el peso cuando estemos en un producto por kg/l.

### Qué comprobamos al final

- El stock se ve actualizado en Inventario.
- Si registramos lotes, aparecen en el detalle del producto.

---

## 7) Distribución (salidas de stock)

### Flujo con carrito

1. Buscamos el producto.
2. Añadimos al carrito con la cantidad.
3. Elegimos el destino/motivo (Cocina, Bar, Eventos…).
4. Confirmamos la salida.

### Alérgenos (seguridad)

Si hay un conflicto con alérgenos y tenemos activado aviso/bloqueo:

- el sistema muestra un aviso/confirmación antes de permitir la salida.

---

## 8) Bajas (pérdidas / ajustes)

Usamos Bajas cuando el stock sale por:

- caducidad
- rotura
- merma
- ajuste de inventario

### Flujo manual

1. Seleccionamos producto.
2. Indicamos cantidad y motivo.
3. Confirmamos.

### Bajas desde Avisos

Cuando hay lotes caducados:

- desde Avisos podemos dar de baja directamente el lote propuesto.

---

## 9) Avisos (centro de alertas)

### Qué revisamos aquí

- **Lotes caducados** y **valor en riesgo**
- **stock bajo** (productos a reponer)
- resumen financiero e informes por profesor/mes (según configuración)

### Acciones rápidas

- **Dar de baja** desde un aviso (caducidad).
- **Crear pedido** desde stock bajo (con cantidad sugerida).

---

## 10) Rendimiento (merma)

Usamos Rendimiento para registrar:

- peso bruto
- peso neto

El sistema calcula:

- desperdicio
- merma (%)
- rendimiento (%)

Guardamos varios registros juntos (en “sesión”) y luego los enviamos.

---

## 11) Escandallos (coste de recetas)

### Crear / editar receta

1. Creamos una receta (nombre, PVP si aplica, elaboración).
2. Añadimos ingredientes desde el inventario.
3. Revisamos:
   - coste total
   - beneficio neto
   - margen (%)
4. Guardamos.

Los indicadores de color nos ayudan a detectar márgenes bajos.

---

## 12) Proveedores y configuración

### Proveedores

- Alta/edición/borrado de proveedores.
- Búsqueda y filtrado en tabla.

### Configuración

Aquí ajustamos preferencias del usuario:

- perfil
- alérgenos
- notificaciones (avisos/bloqueos)

---

## 13) Errores típicos y solución rápida

### “No veo cambios” / “sigue igual”

- Cerramos y abrimos la sección, o recargamos la página.
- Si estamos en local con Docker, revisamos que los contenedores estén levantados.

### “No me deja guardar / sale error 400”

- Suele ser por datos inválidos (campos extra o tipos incorrectos).
- Revisamos el formulario, limpiamos y probamos de nuevo.

### “No puedo hacer scroll en un modal”

- Si ocurre, normalmente es un problema de tamaño de pantalla. Probamos:
  - pantalla completa
  - zoom del navegador al 100%

---

## 14) Checklist de cierre (operativa)

Al terminar una jornada, solemos:

- revisar Avisos (caducidades y stock bajo)
- revisar que recepciones y distribuciones han quedado registradas
- exportar listados si toca inventario parcial

