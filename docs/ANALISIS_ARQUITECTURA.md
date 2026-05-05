# INFORME DE ARQUITECTURA — SMART ECONOMATO (rama `daniel`)
> **Autor:** Análisis automatizado (Arquitecto Full Stack / Tech Lead)
> **Fecha:** Marzo 2026
> **Rama analizada:** `daniel`
> **Stack:** NestJS + React 19 + TypeScript + Vite + PostgreSQL (Supabase)
---
## Nota Previa: Salto Cualitativo Enorme
El salto de la rama `main` (PHP + Vanilla JS) a esta rama `daniel` (NestJS + React/TypeScript) es **extraordinario**. Se ha pasado de scripts PHP monolíticos sin autenticación a una arquitectura moderna con:
- JWT con guards globales y decoradores `@Public()` / `@Roles()`
- Validación con DTOs (`class-validator`, `whitelist`, `forbidNonWhitelisted`)
- Rate limiting global (ThrottlerGuard)
- Respuestas estandarizadas (ResponseInterceptor + AllExceptionsFilter)
- Contraseñas con bcrypt + migración automática de plaintext
- Frontend tipado con TypeScript strict
- Sistema de componentes UI reutilizables (Button, Alert, Spinner, EmptyState)
- Sistema de notificaciones propio (toasts + confirm dialogs) sin dependencias externas
- Barcode scanner integrado con BarcodeDetector API
---
## 1. BACKEND (NestJS + TypeScript)
### 1.1 Seguridad — Lo Bueno y Lo Mejorable
**Lo que está bien hecho:**
- JWT global con `JwtAuthGuard` como `APP_GUARD` — todo protegido por defecto
- `@Public()` solo en `HealthController` y `LoginController` — mínima superficie expuesta
- `@Roles('admin')` en `AuditoriaController` — control de acceso por rol
- Contraseñas hasheadas con bcrypt (cost factor 10)
- Migración automática de contraseñas en texto plano a bcrypt en el login
- `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`
- `ThrottlerModule` con 120 req/60s — protección básica contra brute force
- Queries parametrizadas en todo el backend (`$1`, `$2`...) — sin riesgo de SQL injection
- Mensajes de error genéricos en login — no revela si el usuario existe
**Mejoras necesarias:**
#### 1. JWT Secret débil en `.env.example`
**Archivo:** `backend/.env.example`
```
JWT_SECRET=cambia_esto_por_un_secreto_largo_y_aleatorio
```
Si alguien copia el `.env.example` directamente, cualquiera puede forjar tokens.
**Solución:** El `AuthService` debería fallar al arrancar si el secret es el valor por defecto o tiene menos de 32 caracteres:
```typescript
// backend/src/auth/auth.service.ts
constructor() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'cambia_esto_por_un_secreto_largo_y_aleatorio' || secret.length < 32) {
    throw new Error('JWT_SECRET no configurado o demasiado corto (mínimo 32 caracteres)');
  }
  this.jwtSecret = secret;
}
```
#### 2. Sin refresh tokens
El token JWT expira en 8h (`JWT_EXPIRES_IN=8h`). Si un usuario trabaja un turno de 10h, pierde la sesión. Pero si subes el TTL, un token robado tiene ventana larga.
**Solución:** Implementar un par access token (15-30 min) + refresh token (rotación en cada uso).
#### 3. El payload del JWT incluye `role` pero no se re-valida contra la BD
Si un admin degrada a un usuario, el JWT antiguo sigue teniendo `role: 'admin'` hasta que expire. Con 8h de TTL, esto es un riesgo.
**Solución:** Tokens más cortos o verificar rol contra BD en cada request crítico.
#### 4. `login.service.ts` — duplicación de variable
**Archivo:** `backend/src/login/login.service.ts`, línea ~31
```typescript
const upgradedHash = await hash(password, 10);
const upgradedHash = await hash(password, 10);  // ← DUPLICADO
```
Eliminar la línea duplicada.
#### 5. Sin HTTPS enforcement
`main.ts` no fuerza HTTPS. El tráfico cliente→API podría ir en claro si el despliegue no tiene reverse proxy con TLS.
#### 6. `DB_SSL_REJECT_UNAUTHORIZED` desactivable en producción
Actualmente se puede poner `false` por variable de entorno, lo cual desactiva la validación del certificado SSL. En producción esto permite ataques MITM.
**Solución:** Solo permitir `false` si `NODE_ENV !== 'production'`.
---
### 1.2 Arquitectura del Backend
**Lo que está bien:**
- Separación por módulos NestJS (auth, productos, pedidos, etc.)
- Cada módulo tiene controller + service
- `DatabaseService` centralizado con pool de conexiones
- `AuditoriaService` como servicio compartido en `CommonModule`
- Interceptor global para formato de respuesta uniforme
- Filtro de excepciones global con mensajes coherentes
**Mejoras necesarias:**
#### 7. Sin ORM ni query builder
Todas las queries son SQL crudo con `this.db.query()`. No hay validación de tipos a nivel de BD, cada service repite patrones similares de mapeo de filas, y no hay migraciones versionadas.
**Solución:** Considerar un query builder como **Knex.js** o **Drizzle ORM** para tipado de queries y migraciones automáticas.
#### 8. Mapeo de datos manual y frágil
**Archivo:** `backend/src/productos/productos.service.ts`
```typescript
r.activo = r.activo === true || r.activo === 't' || r.activo === 1 || r.activo === '1';
```
Esto indica que el tipo de `activo` en la BD no es consistente. Normalizar en la BD y usar un mapper dedicado.
#### 9. Operaciones no atómicas — SIN TRANSACCIONES
**Archivos:** `movimientos.service.ts`, `bajas.service.ts`, `pedidos.service.ts`
El flujo es: leer stock → insertar movimiento → actualizar stock. Si dos requests llegan simultáneamente, pueden leer el mismo stock y sobreescribirse.
**Solución:** Usar transacciones PostgreSQL:
```typescript
const client = await this.pool.connect();
try {
  await client.query('BEGIN');
  // ... operaciones ...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```
Añadir un método `transaction()` al `DatabaseService` para reutilizar este patrón.
#### 10. N+1 en `pedidos.service.ts` → `crear()`
Los items del pedido se insertan uno por uno en un `for...of`. Con 20 items = 20 queries.
**Solución:** Batch insert o al menos transacción:
```typescript
const values = body.items.map((_, i) => `($1, $${i*3+2}, $${i*3+3}, $${i*3+4})`).join(', ');
```
#### 11. `findAll()` con subquery correlacionada en pedidos
El `json_agg` con subquery correlacionada ejecuta una subquery por cada pedido. Con 500 pedidos, esto será lento.
**Solución:** JOIN + `GROUP BY` con `json_agg` en la query principal, o cargar items en una segunda query y combinar en JS.
#### 12. `rendimientos.service.ts` — `usuario_id` hardcodeado a `1`
```typescript
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
```
**Solución:** Recibir del controller vía `@Req()` desde el JWT payload.
#### 13. Sin paginación real
Los endpoints `findAll()` de productos, categorías, proveedores devuelven **todo**. Solo `movimientos` tiene `LIMIT 50` hardcodeado.
**Solución:** Implementar `?page=1&limit=50` con `LIMIT/OFFSET` o cursor-based pagination.
#### 14. Sin DTOs tipados con decoradores class-validator
Los métodos `crear()` y `actualizar()` reciben `body: { ... }` como tipos inline en lugar de clases DTO decoradas. El `ValidationPipe` global **no valida el contenido** realmente.
**Solución:** Crear clases DTO:
```typescript
// backend/src/productos/dto/create-producto.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
export class CreateProductoDto {
  @IsString()
  nombre: string;
  @IsNumber()
  @Min(0)
  precio: number;
  @IsNumber()
  @Min(0)
  stock: number;
  @IsOptional()
  @IsString()
  categoriaId?: string;
  // ...
}
```
#### 15. HealthCheck sin verificación de BD
El `HealthController` devuelve `{ status: 'ok' }` sin verificar que la conexión a BD funcione.
**Solución:** Hacer un `SELECT 1` para confirmar.
#### 16. Sin logging estructurado
Solo hay `console.log` y `console.error`.
**Solución:** Usar `nestjs-pino` o el `Logger` nativo de NestJS con niveles.
---
### 1.3 Base de Datos
#### 17. Inconsistencia de naming
- `productos`: camelCase (`categoriaId`, `proveedorId`, `stockMinimo`, `preciounitario`)
- `pedidos`: snake_case (`proveedor_id`, `usuario_id`, `fecha_creacion`)
- `movimientos`: snake_case (`producto_id`, `stock_anterior`)
**Solución:** Unificar todo a **snake_case** en la BD (estándar PostgreSQL) y mapear a camelCase en la capa de aplicación.
#### 18. Sin índices más allá de PKs y FKs
Faltan índices para:
- `productos.nombre` (búsquedas por texto)
- `movimientos.fecha` (filtros por rango)
- `pedidos.estado` (filtrar pendientes)
- `auditoria.fecha` + `auditoria.accion` (índice compuesto)
#### 19. Pool de conexiones con `max: 10` fijo
Debería ser configurable por variable de entorno para producción.
---
## 2. FRONTEND (React 19 + TypeScript + Vite)
### 2.1 UI/UX y Ergonomía Táctil
**Lo que está bien:**
- Design tokens centralizados en `tokens.css`
- `@media (prefers-reduced-motion: reduce)` — excelente para accesibilidad
- Hamburger menu para tablets ≤820px con overlay y animación
- `sr-only`, `aria-label`, `role="tablist"`, `aria-selected` — buen esfuerzo en accesibilidad
- Ghost autocomplete en búsqueda de recepción (Tab/ArrowRight)
- Sistema de toasts con progress bar animada
- Confirm dialogs con backdrop blur y keyboard handling
- Barcode scanner con cámara trasera (`facingMode: "environment"`)
**Mejoras necesarias:**
#### 20. Sin breakpoints intermedios para tablets
El breakpoint principal es `820px` y `520px`. No hay nada entre 820px y 1366px, que es el rango de **iPads**.
**Solución:** Breakpoint ~1024px donde el sidebar sea más estrecho (180-200px) o colapsable a iconos.
```css
@media (min-width: 821px) and (max-width: 1024px) {
  .app-shell { grid-template-columns: 180px 1fr; }
  .sidebar { padding: 20px 12px; }
  .nav-item { font-size: 13px; padding: 12px 14px; }
}
```
#### 21. Hover effects en dispositivos táctiles
`card:hover` tiene `translateY(-5px)`, `card-ico:hover` tiene `scale(1.1)`. En iOS Safari, estos hovers se quedan "pegados" (sticky hover).
**Solución:** Envolver en `@media (hover: hover) { }`.
#### 22. Touch targets borderline
Los botones de GridJS generados con HTML inline necesitan verificación de tamaño mínimo 44×44px.
#### 23. Sin gestos táctiles nativos
Faltan: swipe para eliminar, pull-to-refresh, long-press para opciones contextuales.
#### 24. `window.print()` para PDF
**Archivo:** `RendimientoPage.tsx`
Usa `window.print()` que produce resultados inconsistentes en Safari iOS.
**Solución:** Usar `jsPDF` + `html2canvas` o endpoint backend para PDF.
#### 25. `alert()` nativo en varias páginas
A pesar de tener `showNotification` y `showConfirm` propios:
- **`ConfiguracionPage.tsx` línea 287:** `alert("⚠️ IMPORTANTE\n\nHas registrado...")`
- **`ConfiguracionPage.tsx` línea 575:** `alert("Las alertas de alérgenos...")`
- **`EscandallosPage.tsx` línea 249:** `alert("Selecciona un producto...")`
- **`EscandallosPage.tsx` línea 323:** `alert("Receta guardada correctamente...")`
**Solución:** Reemplazar todos por `showAlert()` / `showNotification()`.
---
### 2.2 Rendimiento
#### 26. GridJS se recrea en cada cambio de datos
**Archivos:** `ProveedoresPage.tsx`, `AuditoriaPage.tsx`, `InventarioTable.tsx`
Cada cambio de datos hace `destroy()` + `new Grid()` + `.render()`.
**Solución:** Usar `.updateConfig({ data: newData })` de GridJS.
#### 27. `InventarioTable` usa MutationObserver
Observa mutaciones DOM para añadir la clase `alerta`. Hack innecesario.
**Solución:** Usar el hook `className` de GridJS para añadir clases durante el render.
#### 28. `IngresarProductoPage` — creación secuencial
**Archivo:** `frontend/src/pages/IngresarProductoPage.tsx`
```typescript
for (const producto of listaTemporal) {
  await crearProducto(productoLimpio);
}
```
20 productos = 20 requests secuenciales.
**Solución:** Endpoint batch `POST /productos/batch` o `Promise.allSettled()`.
#### 29. Google Fonts con `@import` en CSS
**Archivos:** `inicio.css`, `login.css`
`@import url(...)` dentro de CSS es **render-blocking**.
**Solución:** Mover a `<link rel="preconnect">` + `<link rel="stylesheet">` en `index.html`, o self-host Poppins.
#### 30. Sin debounce en búsquedas
**Archivo:** `RecepcionPage.tsx`
Filtra la lista en cada keystroke.
**Solución:** Añadir debounce de 200-300ms:
```typescript
const [debouncedTerm] = useDebounce(term, 250);
```
#### 31. Sin lazy loading de páginas
`AppRouter.tsx` importa todas las páginas directamente.
**Solución:**
```typescript
const PedidosPage = lazy(() => import("./pages/PedidosPage"));
```
---
### 2.3 Gestión del Estado
#### 32. Estado crítico solo en localStorage
Tres tipos de datos se guardan solo en localStorage:
- `usuarioActivo` — perfil del usuario logueado
- `alergias_${userId}` — configuración de alérgenos
- `notificaciones_${userId}` — preferencias de alertas
Si el usuario cambia de dispositivo, pierde toda la configuración.
#### 33. `guardarPerfil()` no llama al backend
**Archivo:** `ConfiguracionPage.tsx`, línea ~245
`localStorage.setItem("usuarioActivo", ...)` — solo persiste en el navegador actual.
**Solución:** Añadir endpoint `PUT /usuarios/:id/perfil` y llamarlo al guardar.
#### 34. Sin gestión centralizada de estado
Cada página mantiene su propio estado con `useState`. Productos se recargan en cada navegación.
**Solución:** Al menos `AuthContext` para el usuario y `@tanstack/react-query` para cache de datos.
```typescript
// src/contexts/AuthContext.tsx
const AuthContext = createContext<AuthState | null>(null);
export function useAuth() { return useContext(AuthContext)!; }
```
#### 35. localStorage parseado fuera de hooks
**Archivo:** `RecepcionPage.tsx`
```typescript
const userRaw = localStorage.getItem("usuarioActivo");
let user: any = null;
```
Se ejecuta en cada render. Mover a `useMemo` o AuthContext.
---
### 2.4 Tipos y TypeScript
#### 36. Tipos duplicados e inconsistentes
El tipo `Producto` se define diferente en al menos 4 archivos:
- `productosService.ts`: tipo completo
- `RecepcionPage.tsx`: tipo reducido
- `IngresarProductoPage.tsx`: `ProductoTemporal`
- `RendimientoPage.tsx`: usa `(p as any).categoria_nombre`
**Solución:** Centralizar en `src/types/`:
```typescript
// src/types/producto.ts
export interface Producto {
  id: number | string;
  nombre: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  activo: boolean;
  categoriaId?: number | string;
  proveedorId?: number | string;
  categoria?: { id: number | string; nombre: string };
  proveedor?: { id: number | string; nombre: string };
  // ...
}
```
#### 37. Uso de `any`
Múltiples usos de `any` en:
- `RecepcionPage.tsx` — `data?: any[]`, `let user: any`
- `InventarioTable.tsx` — `(p as any).stockMinimo`
- `RendimientoPage.tsx` — `(p as any).categoria_nombre`
- `pedidos.service.ts` — `Record<string, any>`
**Solución:** Definir interfaces apropiadas para cada caso.
---
### 2.5 Estructura y Patrones React
#### 38. Componentes monolíticos
- `RecepcionPage.tsx` — **874 líneas**
- `RendimientoPage.tsx` — **922 líneas**
- `AuditoriaPage.tsx` — **730 líneas**
- `EscandallosPage.tsx` — **751 líneas**
- `ConfiguracionPage.tsx` — **722 líneas**
**Solución:** Extraer custom hooks y sub-componentes:
```
RecepcionPage/
├── RecepcionPage.tsx (orquestador, ~100 líneas)
├── components/
│   ├── RecepcionSearchBar.tsx
│   ├── RecepcionTable.tsx
│   └── PedidosDrawer.tsx
└── hooks/
    └── useRecepcion.ts
```
#### 39. `notifications.ts` manipula el DOM directamente
`showNotification()` y `showConfirm()` crean elementos DOM con `document.createElement`, bypaseando el virtual DOM de React.
**Solución a medio plazo:** `<NotificationProvider>` con Context.
#### 40. Event handlers en GridJS via document listeners
**Archivo:** `ProveedoresPage.tsx`
`document.addEventListener("click", handler)` para detectar clicks en botones de GridJS.
**Solución:** Usar `gridjs-react` con integración más limpia o scoped listener.
#### 41. `EscandallosPage` — datos sin persistencia
`ESCANDALLOS_INICIALES` es un array hardcodeado. Los escandallos se pierden al recargar.
**Solución:** Crear tabla `escandallos` + módulo NestJS.
#### 42. `barcodeScanner.ts` — UI imperativa fuera de React
El overlay de escaneo se crea con DOM imperativo. Funciona bien pero es difícil de mantener.
**Solución a medio plazo:** Convertir en componente React con portal.
---
### 2.6 CSS
#### 43. CSS no modular
16 archivos CSS globales en `src/styles/`. Cualquier clase puede colisionar.
**Solución:** CSS Modules (`*.module.css`) o Tailwind CSS.
#### 44. `!important` para override de GridJS
Usar el sistema de temas de GridJS (`className` config) en vez de fuerza bruta.
#### 45. Google Fonts cargada múltiples veces
`inicio.css` y `login.css` ambos importan Poppins. Cargar una sola vez en `index.html`.
---
## 3. ARQUITECTURA Y DEUDA TÉCNICA
### 3.1 Fortalezas Actuales
- Separación clara frontend/backend con proxy de Vite
- `.env.example` bien documentado
- Health/readiness endpoints — listo para K8s/load balancers
- CORS configurable por variable de entorno
### 3.2 Problemas Estructurales
#### 46. Sin transacciones en operaciones críticas
Las operaciones de stock modifican múltiples tablas sin transacción. Puede causar inconsistencias bajo carga concurrente — un bug costoso en gestión de inventario.
#### 47. Sin tests
Cero tests. Al menos necesitáis:
- Tests unitarios para `AuthService`
- Tests de integración para operaciones de stock
- Tests E2E para login → recepción → verificación de stock
#### 48. Sin CI/CD
No hay GitHub Actions ni pipeline de deploy.
**Solución mínima:**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd backend && npm ci && npm run lint && npm run build
      - run: cd frontend && npm ci && npm run lint && npm run build
```
#### 49. Sin migraciones de base de datos
No hay historial de cambios de esquema ni rollback posible.
**Solución:** `node-pg-migrate`, Prisma migrations, o Flyway.
#### 50. Alérgenos solo en frontend
`ALERGENOS_DISPONIBLES` está hardcodeado en `ConfiguracionPage.tsx`. No hay tabla en BD ni relación con productos.
**Solución:** Crear tablas `alergenos` y `producto_alergenos`.
#### 51. Token JWT en localStorage
Accesible por cualquier script JS (XSS). `httpOnly cookies` serían más seguras.
#### 52. Sin manejo de sesión expirada graceful
`apiClient.ts` redirige a `/` en caso de 401, pero no limpia localStorage ni muestra mensaje.
**Solución:**
```typescript
if (res.status === 401) {
  localStorage.removeItem('token');
  localStorage.removeItem('usuarioActivo');
  showNotification('Tu sesión ha expirado. Inicia sesión de nuevo.', 'warning');
  window.location.href = '/';
}
```
#### 53. Auditoría incompleta
No se registra: login/logout, cambios en proveedores/categorías, creación de pedidos, accesos denegados (403).
---
## 4. PLAN DE ACCIÓN PRIORIZADO
### 🔴 CRÍTICO — Hacer ya
1. **Transacciones** en movimientos, bajas y recepción de pedidos
2. **Eliminar la línea duplicada** en `login.service.ts`
3. **Validar JWT_SECRET** al arrancar
4. **Reemplazar `window.alert()`** por `showNotification`/`showAlert`
### 🟡 IMPORTANTE — Corto plazo
5. **DTOs con class-validator** en todos los controllers
6. **Paginación** en productos, pedidos y movimientos
7. **Endpoint batch** para crear productos masivamente
8. **Lazy loading** de páginas con `React.lazy()`
9. **Centralizar tipos** en `src/types/`
10. **AuthContext** para gestión del usuario logueado
11. **Mover Google Fonts** a `<link>` en `index.html`
### 🟢 MEDIO PLAZO — Calidad
12. **CSS Modules** o solución de scoping
13. **Tests unitarios** para auth y operaciones de stock
14. **GitHub Actions** básico: lint + typecheck + test en PR
15. **Query builder** (Knex/Drizzle) para tipado y migraciones
16. **Refactorizar páginas de 700+ líneas** en componentes + hooks
17. **Breakpoint de tablet** (1024px) para iPad
18. **`@media (hover: hover)`** para todos los hover effects
19. **Debounce** en inputs de búsqueda
20. **GridJS `.updateConfig()`** en vez de destroy/recreate
### 🔵 LARGO PLAZO — Escalabilidad
21. **Alérgenos en base de datos** con tabla propia
22. **Escandallos persistidos en BD**
23. **Refresh tokens** con rotación
24. **@tanstack/react-query** para cache y sincronización
25. **WebSockets/SSE** para tiempo real entre dispositivos
26. **Migraciones versionadas** de base de datos
27. **Logging estructurado** (nestjs-pino)
28. **Service Worker** para funcionalidad offline