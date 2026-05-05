# Distribución de stock

Hemos implementado la **distribución** para registrar salidas de stock hacia destinos internos/externos (Cocina, Bar, Eventos, Donación…).

## Patrón de carrito

`DistribucionPage` permite:

- buscar y añadir productos a un **carrito**
- elegir destino/motivo
- confirmar y enviar movimientos al backend

Al confirmar, se itera el carrito y se crean movimientos (`POST /movimientos`) por item.

## Capa de seguridad por alérgenos

Antes de añadir al carrito:

- puede **filtrar** resultados con alérgenos conflictivos
- puede **avisar** o **bloquear** (según preferencias del usuario)

Esto se implementa en `alergenosUtils` + confirmaciones `showConfirm`.

## Báscula (auto‑mode)

Puede capturar cantidades desde báscula (Web Serial) y ajustar el input automáticamente, con pasos:

- `ud` → 1
- `kg/l` → 0.001

## Confirmaciones globales

Se usa `ConfirmDialogHost` (cola + promesas) en vez de `window.confirm`.

## Nota

Hemos metido confirmaciones globales y la capa de alérgenos para reducir errores en una operativa de alta rotación.

