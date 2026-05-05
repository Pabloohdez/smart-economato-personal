import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditoriaService, ACCION_BAJA } from '../common/auditoria.service';

const ENTIDAD_BAJA = 'baja';

@Injectable()
export class BajasService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async findAll(mes?: number, anio?: number) {
    let sql = `
      SELECT b.id, b.fecha_baja as "fechaBaja", b.tipo_baja as "tipoBaja", b.cantidad, b.motivo,
             b.usuario_id as "usuarioId", b.producto_id as "productoId",
             p.nombre as producto_nombre, p.precio as producto_precio, u.username as usuario_nombre
      FROM bajas b
      LEFT JOIN productos p ON b.producto_id = p.id
      LEFT JOIN usuarios u ON b.usuario_id = u.id
    `;
    const params: unknown[] = [];
    if (mes != null || anio != null) {
      sql += ' WHERE EXTRACT(MONTH FROM b.fecha_baja) = $1 AND EXTRACT(YEAR FROM b.fecha_baja) = $2';
      params.push(mes ?? new Date().getMonth() + 1, anio ?? new Date().getFullYear());
    }
    sql += ' ORDER BY b.fecha_baja DESC LIMIT 100';
    const { rows } = await this.db.query(sql, params.length ? params : undefined);
    return rows.map((r: Record<string, unknown>) => ({
      ...r,
      cantidad: Number(r.cantidad),
      producto_precio: Number(r.producto_precio),
    }));
  }

  async crear(
    body: {
      productoId: string;
      cantidad: number;
      tipoBaja: string;
      motivo?: string;
      usuarioId?: string;
      fechaBaja?: string;
    },
    ip?: string,
  ) {
    const productoId = body.productoId;
    const cantidad = Number(body.cantidad);
    const tipoBaja = body.tipoBaja;
    const motivo = body.motivo ?? 'Sin especificar';
    const usuarioId = body.usuarioId ?? 'admin1';
    const fechaBaja = body.fechaBaja ?? new Date().toISOString();

    const result = await this.db.transaction(async (client) => {
      const { rows: prod } = await client.query(
        'SELECT stock, precio, nombre FROM productos WHERE id = $1 FOR UPDATE',
        [productoId],
      );
      if (prod.length === 0) throw new Error('Producto no encontrado');
      const stockActual = Number(prod[0].stock);
      if (stockActual < cantidad) {
        throw new Error(`Stock insuficiente (disponible: ${stockActual}, solicitado: ${cantidad})`);
      }
      const nuevoStock = stockActual - cantidad;
      const bajaId = randomBytes(4).toString('hex');

      await client.query(
        `INSERT INTO bajas (id, producto_id, usuario_id, tipo_baja, cantidad, motivo, fecha_baja)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [bajaId, productoId, usuarioId, tipoBaja, cantidad, motivo, fechaBaja],
      );
      await client.query('UPDATE productos SET stock = $1 WHERE id = $2', [nuevoStock, productoId]);

      return { bajaId, nuevoStock, productoNombre: prod[0].nombre };
    });

    await this.auditoria.registrar(
      usuarioId,
      null,
      ACCION_BAJA,
      ENTIDAD_BAJA,
      null,
      {
        tipo: tipoBaja,
        producto: result.productoNombre,
        cantidad,
        motivo,
      },
      ip,
    );

    return { id: result.bajaId, stockNuevo: result.nuevoStock, message: 'Baja registrada correctamente' };
  }

  async getWeeklyPercentage(): Promise<{ percentage: number }> {
    // Calculate weekly shrinkage percentage (simplified for demo purposes)
    // Returns a percentage based on bajas this week
    const { rows } = await this.db.query(
      `SELECT 
        COALESCE(SUM(CAST(cantidad AS NUMERIC)), 0) as total_bajas
       FROM bajas 
       WHERE fecha_baja >= CURRENT_DATE - INTERVAL '7 days'`,
    );
    
    // Simplified: return a fixed percentage for now
    // In production, this would calculate against actual stock movements
    const percentage = -2;
    return { percentage };
  }
}
