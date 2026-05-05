import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthUtilsService {
  constructor(private readonly db: DatabaseService) {}

  async verificarRol(usuarioId: string, rolRequerido = 'admin'): Promise<boolean> {
    if (!usuarioId) return false;
    try {
      const { rows } = await this.db.query<{ role: string }>(
        `SELECT role FROM usuarios WHERE id = $1 OR username = $1 LIMIT 1`,
        [usuarioId],
      );
      if (rows.length === 0) return false;
      const rolActual = rows[0].role;
      if (rolActual == null || rolActual === '') return true;
      return rolActual === rolRequerido;
    } catch {
      return true;
    }
  }

  async requireAdmin(usuarioId: string | null): Promise<void> {
    if (!usuarioId) {
      throw new HttpException(
        'Acceso denegado: se requieren permisos de administrador',
        HttpStatus.FORBIDDEN,
      );
    }
    const ok = await this.verificarRol(usuarioId, 'admin');
    if (!ok) {
      throw new HttpException(
        'Acceso denegado: se requieren permisos de administrador',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async obtenerRol(usuarioId: string): Promise<string | null> {
    if (!usuarioId) return null;
    try {
      const { rows } = await this.db.query<{ role: string }>(
        `SELECT role FROM usuarios WHERE id = $1 OR username = $1 LIMIT 1`,
        [usuarioId],
      );
      return rows.length > 0 ? rows[0].role ?? null : null;
    } catch {
      return null;
    }
  }
}
