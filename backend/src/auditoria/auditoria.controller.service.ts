import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditoriaControllerService {
  constructor(private readonly db: DatabaseService) {}

  async obtener(filters: {
    usuario?: string;
    accion?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    limite?: number;
    offset?: number;
  }) {
    const where: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.usuario) {
      where.push(`usuario_id = $${idx++}`);
      params.push(filters.usuario);
    }
    if (filters.accion) {
      where.push(`accion = $${idx++}`);
      params.push(filters.accion);
    }
    if (filters.fecha_desde) {
      where.push(`fecha >= $${idx++}`);
      params.push(filters.fecha_desde);
    }
    if (filters.fecha_hasta) {
      where.push(`fecha <= $${idx++}`);
      params.push(filters.fecha_hasta + ' 23:59:59');
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const limite = filters.limite ?? 100;
    const offset = filters.offset ?? 0;
    params.push(limite, offset);

    const { rows } = await this.db.query(
      `SELECT id, usuario_id, usuario_nombre, accion, entidad, entidad_id, detalles, fecha, ip_address
       FROM auditoria ${whereClause} ORDER BY fecha DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params,
    );
    const registros = rows.map((r: Record<string, unknown>) => ({
      ...r,
      detalles: typeof r.detalles === 'string' ? JSON.parse(r.detalles as string) : r.detalles,
    }));

    const { rows: countRows } = await this.db.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM auditoria ${whereClause}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    return { registros, total, limite, offset };
  }

  async registrar(dto: {
    usuario_id: string;
    usuario_nombre?: string;
    accion: string;
    entidad: string;
    entidad_id?: number;
    detalles?: Record<string, unknown>;
  }, ip?: string) {
    const { rows } = await this.db.query(
      `INSERT INTO auditoria (usuario_id, usuario_nombre, accion, entidad, entidad_id, detalles, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, fecha`,
      [
        dto.usuario_id,
        dto.usuario_nombre ?? null,
        dto.accion,
        dto.entidad,
        dto.entidad_id ?? null,
        dto.detalles ? JSON.stringify(dto.detalles) : null,
        ip ?? null,
      ],
    );
    const r = rows[0] as { id: number; fecha: string };
    return {
      id: Number(r.id),
      fecha: r.fecha,
      mensaje: 'Registro de auditoría creado exitosamente',
    };
  }
}
