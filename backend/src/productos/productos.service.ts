import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

type QueryRunner = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

@Injectable()
export class ProductosService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(page?: number, limit?: number) {
    let sql = `
      SELECT 
        p.id, p.nombre, p.precio, p.stock, p.activo, p.imagen, p.descripcion, p.marca,
        p.preciounitario as "precioUnitario",
        p.stockminimo as "stockMinimo",
        p.categoriaid as "categoriaId",
        p.proveedorid as "proveedorId",
        p.unidadmedida as "unidadMedida",
        p.codigobarras as "codigoBarras",
        p.fechacaducidad as "fechaCaducidad",
        c.nombre as categoria_nombre,
        pr.nombre as proveedor_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoriaid = c.id
      LEFT JOIN proveedores pr ON p.proveedorid = pr.id
      ORDER BY p.nombre ASC
    `;
    const params: unknown[] = [];
    if (limit && limit > 0) {
      const safeLimit = Math.min(limit, 200);
      const offset = page && page > 1 ? (page - 1) * safeLimit : 0;
      sql += ` LIMIT $1 OFFSET $2`;
      params.push(safeLimit, offset);
    }
    const { rows } = await this.db.query(sql, params.length ? params : undefined);
    const alergenosByProducto = await this.getAlergenosPorProducto(
      rows.map((row) => String((row as Record<string, unknown>).id ?? '')),
    );

    return rows.map((row: Record<string, unknown>) => {
      const r = { ...row };
      r.categoria = { id: r.categoriaId, nombre: r.categoria_nombre };
      r.proveedor = { id: r.proveedorId, nombre: r.proveedor_nombre };
      r.precio = Number(r.precio);
      r.stock = Number(r.stock);
      r.stockMinimo = Number(r.stockMinimo);
      r.alergenos = alergenosByProducto.get(String(r.id ?? '')) ?? [];
      r.activo = r.activo === true || r.activo === 't' || r.activo === 1 || r.activo === '1';
      delete r.categoria_nombre;
      delete r.proveedor_nombre;
      return r;
    });
  }

  async crear(dto: Record<string, unknown>) {
    const id = (dto.id as string) || randomBytes(4).toString('hex');
    const activo = dto.activo ? true : false;
    await this.db.query(
      `INSERT INTO productos (
        id, nombre, precio, preciounitario, stock, stockminimo,
        categoriaid, proveedorid, unidadmedida, marca, codigobarras,
        fechacaducidad, descripcion, imagen, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        dto.nombre,
        Number(dto.precio),
        dto.precioUnitario ?? null,
        Number(dto.stock ?? 0),
        Number(dto.stockMinimo ?? 0),
        Number(dto.categoriaId ?? 0) || null,
        Number(dto.proveedorId ?? 0) || null,
        dto.unidadMedida ?? null,
        dto.marca ?? null,
        dto.codigoBarras ?? null,
        dto.fechaCaducidad ?? null,
        dto.descripcion ?? null,
        dto.imagen ?? null,
        activo,
      ],
    );
    await this.syncProductoAlergenos(this.db as unknown as QueryRunner, id, dto.alergenos);
    return { ...dto, id };
  }

  async crearBatch(items: Record<string, unknown>[]) {
    return this.db.transaction(async (client) => {
      const results: Array<Record<string, unknown>> = [];
      for (const dto of items) {
        const id = (dto.id as string) || randomBytes(4).toString('hex');
        const activo = dto.activo ? true : false;
        await client.query(
          `INSERT INTO productos (
            id, nombre, precio, preciounitario, stock, stockminimo,
            categoriaid, proveedorid, unidadmedida, marca, codigobarras,
            fechacaducidad, descripcion, imagen, activo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            id,
            dto.nombre,
            Number(dto.precio),
            dto.precioUnitario ?? null,
            Number(dto.stock ?? 0),
            Number(dto.stockMinimo ?? 0),
            Number(dto.categoriaId ?? 0) || null,
            Number(dto.proveedorId ?? 0) || null,
            dto.unidadMedida ?? null,
            dto.marca ?? null,
            dto.codigoBarras ?? null,
            dto.fechaCaducidad ?? null,
            dto.descripcion ?? null,
            dto.imagen ?? null,
            activo,
          ],
        );
        await this.syncProductoAlergenos(client as unknown as QueryRunner, id, dto.alergenos);
        results.push({ ...dto, id });
      }
      return { message: `${results.length} producto(s) creado(s)`, items: results };
    });
  }

  async actualizar(id: string, dto: Record<string, unknown>) {
    const activo = dto.activo ? true : false;
    await this.db.query(
      `UPDATE productos SET
        nombre = $1, precio = $2, preciounitario = $3, stock = $4, stockminimo = $5,
        categoriaid = $6, proveedorid = $7, unidadmedida = $8, marca = $9, codigobarras = $10,
        fechacaducidad = $11, descripcion = $12, imagen = $13, activo = $14
      WHERE id = $15`,
      [
        dto.nombre,
        Number(dto.precio),
        dto.precioUnitario ?? null,
        Number(dto.stock ?? 0),
        Number(dto.stockMinimo ?? 0),
        Number(dto.categoriaId ?? 0) || null,
        Number(dto.proveedorId ?? 0) || null,
        dto.unidadMedida ?? null,
        dto.marca ?? null,
        dto.codigoBarras ?? null,
        dto.fechaCaducidad ?? null,
        dto.descripcion ?? null,
        dto.imagen ?? null,
        activo,
        id,
      ],
    );
    await this.syncProductoAlergenos(this.db as unknown as QueryRunner, id, dto.alergenos);
    return {};
  }

  private async getAlergenosPorProducto(productIds: string[]) {
    const ids = [...new Set(productIds.filter(Boolean))];
    const result = new Map<string, string[]>();

    if (ids.length === 0) return result;

    const { rows } = await this.db.query<{
      productoId: string;
      nombre: string;
    }>(
      `SELECT pa.producto_id as "productoId", a.nombre
       FROM producto_alergenos pa
       INNER JOIN alergenos a ON a.id = pa.alergeno_id
       WHERE pa.producto_id = ANY($1::varchar[])
       ORDER BY a.nombre ASC`,
      [ids],
    );

    rows.forEach((row) => {
      const current = result.get(row.productoId) ?? [];
      current.push(row.nombre);
      result.set(row.productoId, current);
    });

    return result;
  }

  private async syncProductoAlergenos(
    runner: QueryRunner,
    productId: string,
    allergenNames?: unknown,
  ) {
    const nombres = [...new Set(
      Array.isArray(allergenNames)
        ? allergenNames.map((item) => String(item).trim()).filter(Boolean)
        : [],
    )];

    await runner.query('DELETE FROM producto_alergenos WHERE producto_id = $1', [productId]);
    if (nombres.length === 0) return;

    for (const nombre of nombres) {
      await runner.query(
        `INSERT INTO alergenos (nombre)
         VALUES ($1)
         ON CONFLICT (nombre) DO NOTHING`,
        [nombre],
      );
    }

    const result = await runner.query(
      'SELECT id FROM alergenos WHERE nombre = ANY($1::varchar[])',
      [nombres],
    );

    for (const row of result.rows) {
      await runner.query(
        `INSERT INTO producto_alergenos (producto_id, alergeno_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [productId, row.id],
      );
    }
  }

  async getStockBajoCount(): Promise<{ count: number }> {
    const { rows } = await this.db.query(
      `SELECT COUNT(*) as count FROM productos 
       WHERE stock <= stockminimo AND activo = true`,
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    return { count: parseInt(String(row?.count ?? 0), 10) };
  }

  async getAvisosAlertsCount(): Promise<{ count: number }> {
    // Keep Inicio and Avisos aligned: one active alert per affected product.
    const { rows } = await this.db.query(
      `SELECT COUNT(DISTINCT producto_id) AS count
       FROM (
         SELECT p.id AS producto_id
         FROM productos p
         WHERE p.activo = true
           AND p.stockminimo > 0
           AND p.stock <= p.stockminimo

         UNION

         SELECT lp.producto_id AS producto_id
         FROM lotes_producto lp
         INNER JOIN productos p ON p.id = lp.producto_id
         WHERE p.activo = true
           AND lp.cantidad > 0
           AND lp.fecha_caducidad IS NOT NULL
           AND lp.fecha_caducidad < CURRENT_DATE

         UNION

         SELECT p.id AS producto_id
         FROM productos p
         WHERE p.activo = true
           AND p.stock > 0
           AND p.fechacaducidad IS NOT NULL
           AND p.fechacaducidad < CURRENT_DATE
           AND NOT EXISTS (
             SELECT 1
             FROM lotes_producto lp
             WHERE lp.producto_id = p.id
           )
       ) AS alerts`,
    );

    const row = rows[0] as Record<string, unknown> | undefined;
    return { count: parseInt(String(row?.count ?? 0), 10) };
  }
}
