import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export const ACCION_CREAR_PRODUCTO = 'CREAR_PRODUCTO';
export const ACCION_MODIFICAR_PRODUCTO = 'MODIFICAR_PRODUCTO';
export const ACCION_ELIMINAR_PRODUCTO = 'ELIMINAR_PRODUCTO';
export const ACCION_MOVIMIENTO = 'MOVIMIENTO';
export const ACCION_PEDIDO = 'PEDIDO';
export const ACCION_BAJA = 'BAJA';

@Injectable()
export class AuditoriaService {
  constructor(private readonly db: DatabaseService) {}

  async registrar(
    usuarioId: string,
    usuarioNombre: string | null,
    accion: string,
    entidad: string,
    entidadId: number | null,
    detalles: Record<string, unknown> | null,
    ipAddress?: string,
  ): Promise<boolean> {
    try {
      const detallesJson = detalles ? JSON.stringify(detalles) : null;
      await this.db.query(
        `INSERT INTO auditoria (usuario_id, usuario_nombre, accion, entidad, entidad_id, detalles, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          usuarioId,
          usuarioNombre,
          accion,
          entidad,
          entidadId,
          detallesJson,
          ipAddress ?? null,
        ],
      );
      return true;
    } catch (e) {
      console.error('Error al registrar auditoría:', e);
      return false;
    }
  }
}
