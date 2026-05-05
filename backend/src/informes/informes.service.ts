import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InformesService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboard() {
    const [
      gastoRes,
      alertasRes,
      movsRes,
      topRes,
    ] = await Promise.all([
      this.db.query<{ gasto_mensual: string }>(
        `SELECT COALESCE(SUM(total), 0) as gasto_mensual FROM pedidos
         WHERE estado = 'RECIBIDO' AND TO_CHAR(fecha_creacion, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')`,
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*) FROM productos WHERE stock <= stockminimo AND activo = true`,
      ),
      this.db.query(
        `SELECT m.fecha, p.nombre as producto, m.tipo, m.cantidad,
                u.nombre || ' ' || COALESCE(u.apellidos, '') as usuario_nombre
         FROM movimientos m
         JOIN productos p ON m.producto_id = p.id
         LEFT JOIN usuarios u ON m.usuario_id = u.id
         ORDER BY m.fecha DESC LIMIT 10`,
      ),
      this.db.query(
        `SELECT p.nombre, SUM(m.cantidad) as total_salida
         FROM movimientos m JOIN productos p ON m.producto_id = p.id
         WHERE m.tipo = 'SALIDA' AND m.fecha >= (CURRENT_DATE - INTERVAL '30 days')
         GROUP BY p.nombre ORDER BY total_salida DESC LIMIT 5`,
      ),
    ]);
    return {
      gasto_mensual: gastoRes.rows[0]?.gasto_mensual ?? 0,
      alertas_stock: alertasRes.rows[0]?.count ?? 0,
      ultimos_movimientos: movsRes.rows ?? [],
      top_productos: topRes.rows ?? [],
    };
  }

  async getGastosMensuales(usuarioId?: string, fechaInicio?: string, fechaFin?: string) {
    let sql = `
      SELECT TO_CHAR(p.fecha_creacion, 'YYYY-MM') as mes, p.usuario_id,
             u.nombre || ' ' || COALESCE(u.apellidos, '') as nombre_usuario,
             SUM(p.total) as total_mes, COUNT(p.id) as num_pedidos
      FROM pedidos p JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.estado = 'RECIBIDO'
    `;
    const params: unknown[] = [];
    let idx = 1;
    if (usuarioId) {
      sql += ` AND p.usuario_id = $${idx++}`;
      params.push(usuarioId);
    }
    if (fechaInicio) {
      sql += ` AND p.fecha_creacion >= $${idx++}::date`;
      params.push(fechaInicio + '-01');
    }
    if (fechaFin) {
      sql += ` AND p.fecha_creacion < ($${idx++}::date + INTERVAL '1 month')`;
      params.push(fechaFin + '-01');
    }
    sql += ' GROUP BY 1, 2, 3 ORDER BY 1 ASC, 3 ASC';
    const { rows: gastos_por_mes } = await this.db.query(sql, params.length ? params : undefined);

    let sqlTotal = 'SELECT COALESCE(SUM(total), 0) as total_curso FROM pedidos WHERE estado = \'RECIBIDO\'';
    const paramsTotal: unknown[] = [];
    if (usuarioId) {
      sqlTotal += ' AND usuario_id = $1';
      paramsTotal.push(usuarioId);
    }
    const { rows: totalRows } = await this.db.query<{ total_curso: string }>(
      sqlTotal,
      paramsTotal.length ? paramsTotal : undefined,
    );
    const total_curso = parseFloat(totalRows[0]?.total_curso ?? '0');

    return { gastos_por_mes: gastos_por_mes ?? [], total_curso };
  }

  async getUsuarios() {
    const { rows } = await this.db.query(`
      SELECT u.id, u.nombre || ' ' || COALESCE(u.apellidos, '') as nombre_completo,
             COALESCE(SUM(p.total), 0) as total_gastado
      FROM usuarios u
      LEFT JOIN pedidos p ON u.id = p.usuario_id AND p.estado = 'RECIBIDO'
      WHERE u.role != 'ADMIN'
      GROUP BY u.id, u.nombre, u.apellidos ORDER BY u.nombre ASC
    `);
    return rows ?? [];
  }
}
