import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PedidosService {
  private hasUnidadColumn: boolean | null = null;
  private hasLotesTable: boolean | null = null;

  constructor(private readonly db: DatabaseService) {}

  private async ensureLotesTable(client?: { query: (sql: string, params?: unknown[]) => any }) {
    if (this.hasLotesTable) return;
    const runner = client ?? this.db;
    // Intento defensivo: crea la tabla si no existe (en entornos donde el usuario DB tenga permiso).
    await runner.query(`
      CREATE TABLE IF NOT EXISTS lotes_producto (
        id SERIAL PRIMARY KEY,
        producto_id VARCHAR NOT NULL REFERENCES productos(id),
        pedido_id INTEGER NULL REFERENCES pedidos(id),
        detalle_id INTEGER NULL REFERENCES detalles_pedido(id),
        fecha_caducidad DATE NULL,
        cantidad NUMERIC(14,3) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    this.hasLotesTable = true;
  }

  private async supportsUnidadColumn(): Promise<boolean> {
    if (this.hasUnidadColumn != null) {
      return this.hasUnidadColumn;
    }

    const { rows } = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'detalles_pedido'
           AND column_name = 'unidad'
       ) as "exists"`,
    );

    this.hasUnidadColumn = Boolean(rows[0]?.exists);
    return this.hasUnidadColumn;
  }

  async findAll(page?: number, limit?: number) {
    const hasUnidadColumn = await this.supportsUnidadColumn();
    const unidadValueExpr = hasUnidadColumn ? 'pd.unidad' : "'ud'::varchar";
    const safeLimit = limit && limit > 0 ? Math.min(limit, 200) : undefined;
    let sql = `
      SELECT 
        p.*, 
        pr.nombre as proveedor_nombre, 
        u.username as usuario_nombre,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', pd.id,
                'pedido_id', pd.pedido_id,
                'producto_id', pd.producto_id,
                'unidad', ${unidadValueExpr},
                'cantidad', pd.cantidad,
                'cantidad_recibida', pd.cantidad_recibida,
                'precio_unitario', pd.precio_unitario,
                'producto_nombre', prod.nombre
              )
            ), 
            '[]'::json
          )
          FROM detalles_pedido pd
          LEFT JOIN productos prod ON pd.producto_id = prod.id
          WHERE pd.pedido_id = p.id
        ) as items
      FROM pedidos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.fecha_creacion DESC
    `;
    const params: unknown[] = [];
    if (safeLimit) {
      const offset = page && page > 1 ? (page - 1) * safeLimit : 0;
      sql += ` LIMIT $1 OFFSET $2`;
      params.push(safeLimit, offset);
    }
    const { rows } = await this.db.query(sql, params.length ? params : undefined);
    return rows.map((r: Record<string, any>) => ({
      ...r,
      proveedorId: r.proveedor_id,
      usuarioId: r.usuario_id,
      fechaCreacion: r.fecha_creacion,
    }));
  }

  async findOne(id: number) {
    const hasUnidadColumn = await this.supportsUnidadColumn();
    const unidadSelect = hasUnidadColumn ? 'pd.unidad' : "'ud'::varchar as unidad";
    const { rows: head } = await this.db.query(
      `SELECT p.*, pr.nombre as proveedor_nombre, u.username as usuario_nombre
       FROM pedidos p
       LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = $1`,
      [id],
    );
    if (head.length === 0) return null;
    const h = head[0] as Record<string, unknown>;
    const pedido: Record<string, unknown> = { ...h, proveedorId: h.proveedor_id };

    const { rows: items } = await this.db.query(
      `SELECT pd.id, pd.pedido_id, pd.producto_id, ${unidadSelect}, pd.cantidad, pd.cantidad_recibida, pd.precio_unitario, p.nombre as producto_nombre
       FROM detalles_pedido pd
       LEFT JOIN productos p ON pd.producto_id = p.id
       WHERE pd.pedido_id = $1`,
      [id],
    );
    pedido.items = items;
    return pedido;
  }

  async crear(body: {
    proveedorId: number;
    total?: number;
    usuarioId?: number | string;
    items?: Array<{ producto_id: string; unidad?: string; cantidad: number; precio: number }>;
  }) {
    const hasUnidadColumn = await this.supportsUnidadColumn();
    let userId: string | number | undefined = body.usuarioId;
    if (userId != null) {
      const { rowCount } = await this.db.query('SELECT id FROM usuarios WHERE id = $1', [userId]);
      if (rowCount === 0) userId = undefined;
    }
    if (userId == null) {
      const { rows } = await this.db.query<{ id: string | number }>('SELECT id FROM usuarios LIMIT 1');
      userId = rows.length > 0 ? (rows[0] as { id: string | number }).id : 1;
    }

    return this.db.transaction(async (client) => {
      const { rows: ins } = await client.query(
        `INSERT INTO pedidos (proveedor_id, usuario_id, estado, total) VALUES ($1, $2, 'PENDIENTE', $3) RETURNING id`,
        [body.proveedorId, userId, body.total ?? 0],
      );
      const pedidoId = (ins[0] as { id: number }).id;
      if (body.items?.length) {
        for (const item of body.items) {
          if (hasUnidadColumn) {
            await client.query(
              `INSERT INTO detalles_pedido (pedido_id, producto_id, unidad, cantidad, precio_unitario) VALUES ($1, $2, $3, $4, $5)`,
              [pedidoId, item.producto_id, item.unidad ?? 'ud', item.cantidad, item.precio],
            );
          } else {
            await client.query(
              `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)`,
              [pedidoId, item.producto_id, item.cantidad, item.precio],
            );
          }
        }
      }
      return { id: pedidoId };
    });
  }

  async actualizar(
    id: number,
    body: {
      accion?: string;
      estado?: string;
      items?: Array<{ detalle_id: number; cantidad_recibida: number; lotes?: Array<{ fecha_caducidad?: string | null; cantidad: number }> }>;
    },
  ) {
    if (body.accion === 'RECIBIR') {
      if (body.items?.length) {
        return this.db.transaction(async (client) => {
          await this.ensureLotesTable(client as any);

          for (const item of body.items!) {
            const cant = Number(item.cantidad_recibida);
            if (cant > 0) {
              const { rows } = await client.query(
                'SELECT producto_id FROM detalles_pedido WHERE id = $1',
                [item.detalle_id],
              );
              if (rows.length > 0) {
                const prodId = (rows[0] as { producto_id: string }).producto_id;

                // Si vienen lotes, validamos y los registramos
                if (Array.isArray(item.lotes) && item.lotes.length > 0) {
                  const sumLotes = item.lotes.reduce((s, l) => s + Number(l.cantidad || 0), 0);
                  const diff = Math.abs(sumLotes - cant);
                  if (diff > 0.0005) {
                    throw new Error(`La suma de lotes (${sumLotes}) no coincide con lo recibido (${cant})`);
                  }

                  for (const lote of item.lotes) {
                    const lcant = Number(lote.cantidad);
                    if (!Number.isFinite(lcant) || lcant <= 0) continue;
                    await client.query(
                      `INSERT INTO lotes_producto (producto_id, pedido_id, detalle_id, fecha_caducidad, cantidad)
                       VALUES ($1, $2, $3, $4, $5)`,
                      [prodId, id, item.detalle_id, lote.fecha_caducidad ?? null, lcant],
                    );
                  }

                  // Actualizar fechaCaducidad del producto a la más próxima de los lotes con cantidad>0
                  const { rows: minRows } = await client.query(
                    `SELECT MIN(fecha_caducidad) as min_fecha
                     FROM lotes_producto
                     WHERE producto_id = $1 AND cantidad > 0 AND fecha_caducidad IS NOT NULL`,
                    [prodId],
                  );
                  const minFecha = (minRows?.[0] as any)?.min_fecha ?? null;
                  await client.query(
                    `UPDATE productos SET fechacaducidad = $1 WHERE id = $2`,
                    [minFecha, prodId],
                  );
                }

                await client.query(
                  'UPDATE productos SET stock = stock + $1 WHERE id = $2',
                  [cant, prodId],
                );

                await client.query(
                  'UPDATE detalles_pedido SET cantidad_recibida = COALESCE(cantidad_recibida, 0) + $1 WHERE id = $2',
                  [cant, item.detalle_id],
                );
              }
            }
          }

          const { rows: checkRows } = await client.query(
            'SELECT SUM(cantidad) as total_pedida, SUM(cantidad_recibida) as total_recibida FROM detalles_pedido WHERE pedido_id = $1',
            [id],
          );
          const totalPedida = Number(checkRows[0].total_pedida || 0);
          const totalRecibida = Number(checkRows[0].total_recibida || 0);

          const newEstado = totalRecibida >= totalPedida ? 'RECIBIDO' : 'INCOMPLETO';
          await client.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [newEstado, id]);

          return { message: 'Pedido verificado, stock y estado actualizados' };
        });
      }
      
      return { message: 'No se recibieron items válidos' };
    }
    
    if (body.accion === 'CANCELAR') {
      await this.db.query("UPDATE pedidos SET estado = 'CANCELADO' WHERE id = $1", [id]);
      return { message: 'Pedido rechazado' };
    }
    
    const estado = body.estado ?? 'PENDIENTE';
    await this.db.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, id]);
    return { message: 'Estado actualizado' };
  }

  async getPendingTodayCount(): Promise<{ count: number }> {
    const { rows } = await this.db.query(
      `SELECT COUNT(*) as count FROM pedidos 
       WHERE estado IN ('PENDIENTE', 'INCOMPLETO')`,
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    return { count: parseInt(String(row?.count ?? 0), 10) };
  }
}

