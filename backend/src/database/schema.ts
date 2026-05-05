import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

export const categorias = pgTable('categorias', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  descripcion: text('descripcion'),
});

export const proveedores = pgTable('proveedores', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  contacto: varchar('contacto', { length: 100 }),
  telefono: varchar('telefono', { length: 20 }),
  email: varchar('email', { length: 100 }),
  direccion: text('direccion'),
});

export const usuarios = pgTable('usuarios', {
  id: text('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).default('user'),
  nombre: varchar('nombre', { length: 100 }),
  apellidos: varchar('apellidos', { length: 100 }),
  email: varchar('email', { length: 100 }),
  status: varchar('status', { length: 20 }).default('pending_approval'),
  emailVerifiedAt: timestamp('email_verified_at', { mode: 'string' }),
  verificationSentAt: timestamp('verification_sent_at', { mode: 'string' }),
  telefono: varchar('telefono', { length: 20 }),
});

export const productos = pgTable('productos', {
  id: text('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  precio: numeric('precio', { precision: 10, scale: 2, mode: 'number' }).notNull(),
  precioUnitario: varchar('preciounitario', { length: 20 }),
  stock: numeric('stock', { precision: 14, scale: 3, mode: 'number' }).default(0),
  stockMinimo: numeric('stockminimo', { precision: 14, scale: 3, mode: 'number' }).default(0),
  categoriaId: integer('categoriaid').references(() => categorias.id),
  proveedorId: integer('proveedorid').references(() => proveedores.id),
  unidadMedida: varchar('unidadmedida', { length: 20 }),
  marca: varchar('marca', { length: 50 }),
  codigoBarras: varchar('codigobarras', { length: 50 }),
  fechaCaducidad: date('fechacaducidad', { mode: 'string' }),
  descripcion: text('descripcion'),
  imagen: varchar('imagen', { length: 255 }),
  activo: boolean('activo').default(true),
});

export const pedidos = pgTable('pedidos', {
  id: serial('id').primaryKey(),
  proveedorId: integer('proveedor_id').notNull().references(() => proveedores.id),
  fechaCreacion: timestamp('fecha_creacion', { mode: 'string' }).defaultNow(),
  fechaRecepcion: timestamp('fecha_recepcion', { mode: 'string' }),
  estado: varchar('estado', { length: 20 }).default('PENDIENTE'),
  total: numeric('total', { precision: 10, scale: 2, mode: 'number' }).default(0),
  usuarioId: text('usuario_id').notNull().references(() => usuarios.id),
});

export const detallesPedido = pgTable('detalles_pedido', {
  id: serial('id').primaryKey(),
  pedidoId: integer('pedido_id').notNull().references(() => pedidos.id),
  productoId: text('producto_id').notNull().references(() => productos.id),
  unidad: varchar('unidad', { length: 20 }).default('ud'),
  cantidad: numeric('cantidad', { precision: 14, scale: 3, mode: 'number' }).notNull(),
  cantidadRecibida: numeric('cantidad_recibida', { precision: 14, scale: 3, mode: 'number' }).default(0),
  precioUnitario: numeric('precio_unitario', { precision: 10, scale: 2, mode: 'number' }).notNull(),
});

// Lotes por caducidad (para recepciones con múltiples fechas por línea)
export const lotesProducto = pgTable('lotes_producto', {
  id: serial('id').primaryKey(),
  productoId: text('producto_id').notNull().references(() => productos.id),
  pedidoId: integer('pedido_id').references(() => pedidos.id),
  detalleId: integer('detalle_id').references(() => detallesPedido.id),
  fechaCaducidad: date('fecha_caducidad', { mode: 'string' }),
  cantidad: numeric('cantidad', { precision: 14, scale: 3, mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export const movimientos = pgTable('movimientos', {
  id: serial('id').primaryKey(),
  productoId: text('producto_id').references(() => productos.id),
  usuarioId: text('usuario_id').references(() => usuarios.id),
  tipo: varchar('tipo', { length: 20 }).notNull(),
  cantidad: numeric('cantidad', { precision: 14, scale: 3, mode: 'number' }).notNull(),
  stockAnterior: numeric('stock_anterior', { precision: 14, scale: 3, mode: 'number' }).notNull(),
  stockNuevo: numeric('stock_nuevo', { precision: 14, scale: 3, mode: 'number' }).notNull(),
  motivo: varchar('motivo', { length: 255 }),
  fecha: timestamp('fecha', { mode: 'string' }).defaultNow(),
});

export const alergenos = pgTable('alergenos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  icono: varchar('icono', { length: 80 }),
  colorBg: varchar('color_bg', { length: 20 }),
  colorTexto: varchar('color_texto', { length: 20 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
}, (table) => ({
  nombreUnique: unique('alergenos_nombre_unique').on(table.nombre),
}));

export const productoAlergenos = pgTable('producto_alergenos', {
  productoId: text('producto_id').notNull().references(() => productos.id),
  alergenoId: integer('alergeno_id').notNull().references(() => alergenos.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.productoId, table.alergenoId] }),
}));

export const usuarioAlergenos = pgTable('usuario_alergenos', {
  usuarioId: text('usuario_id').notNull().references(() => usuarios.id),
  alergenoId: integer('alergeno_id').notNull().references(() => alergenos.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.usuarioId, table.alergenoId] }),
}));

export const escandallos = pgTable('escandallos', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  autor: varchar('autor', { length: 100 }),
  coste: numeric('coste', { precision: 10, scale: 2, mode: 'number' }).default(0),
  pvp: numeric('pvp', { precision: 10, scale: 2, mode: 'number' }).default(0),
  elaboracion: text('elaboracion'),
  usuarioId: text('usuario_id').references(() => usuarios.id),
  fechaCreacion: timestamp('fecha_creacion', { mode: 'string' }).defaultNow(),
  fechaActualizacion: timestamp('fecha_actualizacion', { mode: 'string' }).defaultNow(),
});

export const escandalloItems = pgTable('escandallo_items', {
  id: serial('id').primaryKey(),
  escandalloId: integer('escandallo_id').notNull().references(() => escandallos.id),
  productoId: text('producto_id').notNull().references(() => productos.id),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  cantidad: numeric('cantidad', { precision: 10, scale: 3, mode: 'number' }).notNull(),
  precio: numeric('precio', { precision: 10, scale: 2, mode: 'number' }).notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull().references(() => usuarios.id),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  rotatedAt: timestamp('rotated_at', { mode: 'string' }),
  revokedAt: timestamp('revoked_at', { mode: 'string' }),
}, (table) => ({
  tokenHashUnique: unique('refresh_tokens_token_hash_unique').on(table.tokenHash),
}));

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull().references(() => usuarios.id),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  consumedAt: timestamp('consumed_at', { mode: 'string' }),
}, (table) => ({
  tokenHashUnique: unique('email_verification_tokens_token_hash_unique').on(table.tokenHash),
}));

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull().references(() => usuarios.id),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  consumedAt: timestamp('consumed_at', { mode: 'string' }),
}, (table) => ({
  tokenHashUnique: unique('password_reset_tokens_token_hash_unique').on(table.tokenHash),
}));

export const schema = {
  categorias,
  proveedores,
  usuarios,
  productos,
  pedidos,
  detallesPedido,
  lotesProducto,
  movimientos,
  alergenos,
  productoAlergenos,
  usuarioAlergenos,
  escandallos,
  escandalloItems,
  refreshTokens,
  emailVerificationTokens,
  passwordResetTokens,
};