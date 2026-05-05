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
      // Serializa la creación/fusión por proveedor para evitar carreras:
      // si dos profesores crean a la vez, el segundo espera y fusiona.
      await client.query(`SELECT pg_advisory_xact_lock($1)`, [body.proveedorId]);

      // Si ya hay pedido(s) pendiente(s) del mismo proveedor:
      // - Reutilizamos el más reciente
      // - Si por cualquier motivo ya existen varios pendientes, los consolidamos en uno
      //   para evitar duplicados visibles.
      const { rows: existingRows } = await client.query(
        `
        SELECT id
        FROM pedidos
        WHERE proveedor_id = $1
          AND estado IN ('PENDIENTE', 'INCOMPLETO')
        ORDER BY fecha_creacion DESC
        FOR UPDATE
        `,
        [body.proveedorId],
      );

      let pedidoId: number;
      let mergedIntoExisting = false;

      if (existingRows.length > 0) {
        pedidoId = Number((existingRows[0] as { id: number }).id);
        mergedIntoExisting = true;

        // Consolidación: si hay más de un pendiente, volcamos sus líneas al pedidoId principal y los cancelamos.
        if (existingRows.length > 1) {
          const otherIds = existingRows.slice(1).map((r) => Number((r as any).id)).filter((n) => Number.isFinite(n));
          for (const otherId of otherIds) {
            // Traer líneas del pedido antiguo
            const { rows: detRows } = await client.query(
              hasUnidadColumn
                ? `SELECT producto_id, unidad, cantidad, precio_unitario FROM detalles_pedido WHERE pedido_id = $1`
                : `SELECT producto_id, cantidad, precio_unitario FROM detalles_pedido WHERE pedido_id = $1`,
              [otherId],
            );

            for (const d of detRows as any[]) {
              const producto_id = String(d.producto_id);
              const unidad = hasUnidadColumn ? String(d.unidad ?? 'ud') : 'ud';
              const cantidad = Number(d.cantidad ?? 0);
              const precio = Number(d.precio_unitario ?? 0);
              if (!Number.isFinite(cantidad) || cantidad <= 0) continue;

              if (hasUnidadColumn) {
                const { rows: det } = await client.query(
                  `
                  SELECT id
                  FROM detalles_pedido
                  WHERE pedido_id = $1 AND producto_id = $2 AND unidad = $3
                  LIMIT 1
                  FOR UPDATE
                  `,
                  [pedidoId, producto_id, unidad],
                );
                if (det.length > 0) {
                  const detId = Number((det[0] as any).id);
                  await client.query(
                    `UPDATE detalles_pedido
                     SET cantidad = COALESCE(cantidad, 0) + $1
                     WHERE id = $2`,
                    [cantidad, detId],
                  );
                } else {
                  await client.query(
                    `INSERT INTO detalles_pedido (pedido_id, producto_id, unidad, cantidad, precio_unitario) VALUES ($1, $2, $3, $4, $5)`,
                    [pedidoId, producto_id, unidad, cantidad, precio],
                  );
                }
              } else {
                const { rows: det } = await client.query(
                  `
                  SELECT id
                  FROM detalles_pedido
                  WHERE pedido_id = $1 AND producto_id = $2
                  LIMIT 1
                  FOR UPDATE
                  `,
                  [pedidoId, producto_id],
                );
                if (det.length > 0) {
                  const detId = Number((det[0] as any).id);
                  await client.query(
                    `UPDATE detalles_pedido
                     SET cantidad = COALESCE(cantidad, 0) + $1
                     WHERE id = $2`,
                    [cantidad, detId],
                  );
                } else {
                  await client.query(
                    `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)`,
                    [pedidoId, producto_id, cantidad, precio],
                  );
                }
              }
            }

            // Cancelar el pedido duplicado (dejamos trazabilidad sin borrarlo)
            await client.query(`UPDATE pedidos SET estado = 'CANCELADO', total = 0 WHERE id = $1`, [otherId]);
          }
        }
      } else {
        const { rows: ins } = await client.query(
          `INSERT INTO pedidos (proveedor_id, usuario_id, estado, total) VALUES ($1, $2, 'PENDIENTE', $3) RETURNING id`,
          [body.proveedorId, userId, body.total ?? 0],
        );
        pedidoId = Number((ins[0] as { id: number }).id);
      }

      if (body.items?.length) {
        for (const rawItem of body.items) {
          const item = {
            producto_id: String(rawItem.producto_id),
            unidad: rawItem.unidad ?? 'ud',
            cantidad: Number(rawItem.cantidad),
            precio: Number(rawItem.precio),
          };
          if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) continue;

          if (hasUnidadColumn) {
            // Si ya existe línea de ese producto+unidad, acumulamos cantidad.
            const { rows: det } = await client.query(
              `
              SELECT id, cantidad
              FROM detalles_pedido
              WHERE pedido_id = $1 AND producto_id = $2 AND unidad = $3
              LIMIT 1
              FOR UPDATE
              `,
              [pedidoId, item.producto_id, item.unidad],
            );

            if (det.length > 0) {
              const detId = Number((det[0] as any).id);
              await client.query(
                `UPDATE detalles_pedido
                 SET cantidad = COALESCE(cantidad, 0) + $1,
                     precio_unitario = $2
                 WHERE id = $3`,
                [item.cantidad, item.precio, detId],
              );
            } else {
              await client.query(
                `INSERT INTO detalles_pedido (pedido_id, producto_id, unidad, cantidad, precio_unitario) VALUES ($1, $2, $3, $4, $5)`,
                [pedidoId, item.producto_id, item.unidad, item.cantidad, item.precio],
              );
            }
          } else {
            // Esquema antiguo: sin unidad, se acumula por producto.
            const { rows: det } = await client.query(
              `
              SELECT id, cantidad
              FROM detalles_pedido
              WHERE pedido_id = $1 AND producto_id = $2
              LIMIT 1
              FOR UPDATE
              `,
              [pedidoId, item.producto_id],
            );

            if (det.length > 0) {
              const detId = Number((det[0] as any).id);
              await client.query(
                `UPDATE detalles_pedido
                 SET cantidad = COALESCE(cantidad, 0) + $1,
                     precio_unitario = $2
                 WHERE id = $3`,
                [item.cantidad, item.precio, detId],
              );
            } else {
              await client.query(
                `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)`,
                [pedidoId, item.producto_id, item.cantidad, item.precio],
              );
            }
          }
        }
      }

      // Recalcular total real desde detalles (evita desajustes si se fusiona).
      const { rows: totalRows } = await client.query(
        `SELECT COALESCE(SUM(cantidad * precio_unitario), 0) as total FROM detalles_pedido WHERE pedido_id = $1`,
        [pedidoId],
      );
      const total = Number((totalRows?.[0] as any)?.total ?? 0);
      await client.query(`UPDATE pedidos SET total = $1 WHERE id = $2`, [total, pedidoId]);

      return { id: pedidoId, merged: mergedIntoExisting };
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

