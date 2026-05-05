import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccountSecurityService } from '../auth/account-security.service';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accountSecurityService: AccountSecurityService,
  ) {}

  async findByIdOrUsername(idOrUsername: string) {
    const { rows } = await this.db.query(
      `SELECT id, username, nombre, apellidos, email, telefono, role FROM usuarios WHERE id = $1 OR username = $1 LIMIT 1`,
      [idOrUsername],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return rows[0];
  }

  async crear(dto: {
    usuario: string;
    password: string;
    nombre?: string;
    apellidos?: string;
    email?: string;
    telefono?: string;
    rol?: string;
  }) {
    const normalizedEmail = dto.email?.trim().toLowerCase() || null;
    if (!normalizedEmail) {
      throw new BadRequestException('El correo electronico es obligatorio para registrar la cuenta.');
    }

    const duplicated = await this.db.query<{ id: string }>(
      `SELECT id
       FROM usuarios
       WHERE username = $1 OR lower(email) = lower($2)
       LIMIT 1`,
      [dto.usuario, normalizedEmail],
    );

    if (duplicated.rows.length > 0) {
      throw new ConflictException('Ya existe una cuenta con ese usuario o correo electronico.');
    }

    const id = randomBytes(4).toString('hex');
    const hashedPassword = await hash(dto.password, 10);

    await this.db.query(
      `INSERT INTO usuarios (id, username, password, nombre, apellidos, email, telefono, role, status, email_verified_at, verification_sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, CURRENT_TIMESTAMP)`,
      [
        id,
        dto.usuario,
        hashedPassword,
        dto.nombre ?? null,
        dto.apellidos ?? null,
        normalizedEmail,
        dto.telefono ?? null,
        dto.rol ?? 'usuario',
        'pending_approval',
      ],
    );

    return {
      id,
      usuario: dto.usuario,
      nombre: dto.nombre ?? null,
      apellidos: dto.apellidos ?? null,
      email: normalizedEmail,
      telefono: dto.telefono ?? null,
      rol: dto.rol ?? 'usuario',
      status: 'pending_approval',
      message: 'Solicitud de alta recibida. Un administrador la revisará pronto.',
    };
  }

  async getPendingRequests() {
    const { rows: accountRows } = await this.db.query(
      `SELECT id, username AS usuario, nombre, apellidos, email, telefono, verification_sent_at AS fecha_creacion
       FROM usuarios
       WHERE status = $1
       ORDER BY verification_sent_at DESC NULLS LAST, username ASC`,
      ['pending_approval'],
    );

    const { rows: passwordRows } = await this.db.query(
      `SELECT
         prt.id as token_id,
         u.id,
         u.username AS usuario,
         u.nombre,
         u.apellidos,
         u.email,
         u.telefono,
         prt.created_at as fecha_creacion
       FROM password_reset_tokens prt
       INNER JOIN usuarios u ON u.id = prt.usuario_id
       WHERE prt.consumed_at IS NULL
         AND prt.expires_at > CURRENT_TIMESTAMP
       ORDER BY prt.created_at DESC`,
    );

    return [
      ...accountRows.map((row) => ({
        ...row,
        request_type: 'account_creation',
      })),
      ...passwordRows.map((row) => ({
        ...row,
        request_type: 'password_change',
      })),
    ];
  }

  async approveRequest(userId: string, role?: string) {
    const { rows } = await this.db.query(`SELECT id FROM usuarios WHERE id = $1`, [userId]);
    if (rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const normalizedRole = String(role ?? 'usuario').trim().toLowerCase();
    const allowedRoles = new Set(['usuario', 'alumno', 'profesor', 'administrador', 'admin']);
    if (!allowedRoles.has(normalizedRole)) {
      throw new BadRequestException('Rol inválido para la aprobación.');
    }

    const roleToStore = normalizedRole === 'admin' ? 'administrador' : normalizedRole;

    await this.db.query(
      `UPDATE usuarios
       SET status = $1,
           role = $2,
           email_verified_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      ['approved', roleToStore, userId],
    );

    return { message: `Solicitud aprobada. Rol asignado: ${roleToStore}.` };
  }

  async rejectRequest(userId: string) {
    const { rows } = await this.db.query(`SELECT id FROM usuarios WHERE id = $1`, [userId]);
    if (rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.db.query(`DELETE FROM usuarios WHERE id = $1`, [userId]);

    return { message: 'Solicitud rechazada. El usuario ha sido eliminado.' };
  }

  async applyPasswordChangeRequest(tokenId: string, nextPassword: string) {
    if (nextPassword.trim().length < 8) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres.');
    }

    const { rows } = await this.db.query<{ usuarioId: string }>(
      `SELECT usuario_id as "usuarioId"
       FROM password_reset_tokens
       WHERE id = $1
         AND consumed_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [tokenId],
    );

    const request = rows[0];
    if (!request) {
      throw new NotFoundException('Solicitud de cambio de contraseña no encontrada o expirada.');
    }

    const hashed = await hash(nextPassword, 10);

    await this.db.transaction(async (client) => {
      await client.query(`UPDATE usuarios SET password = $1 WHERE id = $2`, [hashed, request.usuarioId]);
      await client.query(
        `UPDATE password_reset_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [tokenId],
      );
      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE usuario_id = $1 AND revoked_at IS NULL`,
        [request.usuarioId],
      );
    });

    return { message: 'Contraseña actualizada correctamente.' };
  }

  async rejectPasswordChangeRequest(tokenId: string) {
    const { rowCount } = await this.db.query(
      `UPDATE password_reset_tokens
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND consumed_at IS NULL`,
      [tokenId],
    );

    if (!rowCount) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    return { message: 'Solicitud de cambio de contraseña rechazada.' };
  }
}
