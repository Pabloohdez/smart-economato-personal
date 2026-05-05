import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RendimientosService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(limit = 100) {
    const { rows } = await this.db.query(
      `SELECT * FROM rendimientos ORDER BY fecha DESC, created_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map((r: Record<string, unknown>) => ({
      ...r,
      pesoBruto: Number(r.peso_bruto),
      pesoNeto: Number(r.peso_neto),
      desperdicio: Number(r.desperdicio),
      rendimiento: Number(r.rendimiento),
      merma: Number(r.merma),
    }));
  }

  async crear(
    items: Array<{
      ingrediente?: string;
      pesoBruto?: number;
      pesoNeto?: number;
      desperdicio?: number;
      rendimiento?: number;
      merma?: number;
      observaciones?: string;
      fecha?: string;
    }>,
  ) {
    const list = Array.isArray(items) ? items : [items];
    let exitos = 0;
    const fechaDefault = new Date().toISOString().slice(0, 10);
    for (const item of list) {
      await this.db.query(
        `INSERT INTO rendimientos (ingrediente, peso_bruto, peso_neto, desperdicio, rendimiento, merma, observaciones, fecha, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
        [
          item.ingrediente ?? '',
          Number(item.pesoBruto ?? 0),
          Number(item.pesoNeto ?? 0),
          Number(item.desperdicio ?? 0),
          Number(item.rendimiento ?? 0),
          Number(item.merma ?? 0),
          item.observaciones ?? null,
          item.fecha ?? fechaDefault,
        ],
      );
      exitos++;
    }
    return { message: exitos === 1 ? '1 registro guardado' : `${exitos} registros guardados` };
  }

  async eliminar(id: number) {
    const { rowCount } = await this.db.query('DELETE FROM rendimientos WHERE id = $1', [id]);
    if (rowCount === 0) throw new Error('Registro no encontrado');
    return { message: 'Registro eliminado' };
  }
}
