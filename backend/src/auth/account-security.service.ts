import { createHash, randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';

type AccountEmailUser = {
  id: string;
  username: string;
  nombre?: string | null;
  apellidos?: string | null;
  email: string;
  emailVerifiedAt?: string | null;
};

@Injectable()
export class AccountSecurityService {
  constructor(
    private readonly db: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  async sendVerificationEmail(user: AccountEmailUser) {
    const token = this.createRawToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.getFutureDateHours(this.getVerifyExpiryHours());

    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE email_verification_tokens
         SET consumed_at = CURRENT_TIMESTAMP
         WHERE usuario_id = $1 AND consumed_at IS NULL`,
        [user.id],
      );

      await client.query(
        `INSERT INTO email_verification_tokens (id, usuario_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [randomBytes(16).toString('hex'), user.id, tokenHash, expiresAt],
      );

      await client.query(
        `UPDATE usuarios
         SET verification_sent_at = CURRENT_TIMESTAMP,
             email_verified_at = NULL
         WHERE id = $1`,
        [user.id],
      );
    });

    const verificationUrl = `${this.getFrontendUrl()}/verificar-cuenta?token=${encodeURIComponent(token)}`;
    const displayName = this.getDisplayName(user);

    const deliveryMode = await this.mailService.sendMail({
      to: user.email,
      subject: 'Verifica tu cuenta de Smart Economato',
      text:
        `Hola ${displayName},\n\n` +
        `Pulsa este enlace para verificar tu cuenta:\n${verificationUrl}\n\n` +
        `El enlace caduca en ${this.getVerifyExpiryHours()} horas.`,
      html:
        `<p>Hola <strong>${displayName}</strong>,</p>` +
        `<p>Pulsa este enlace para verificar tu cuenta de Smart Economato:</p>` +
        `<p><a href="${verificationUrl}">${verificationUrl}</a></p>` +
        `<p>El enlace caduca en ${this.getVerifyExpiryHours()} horas.</p>`,
    });

    return {
      deliveryMode,
    };
  }

  async verifyAccount(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const { rows } = await this.db.query<{
      tokenId: string;
      usuarioId: string;
      expiresAt: string;
      consumedAt: string | null;
      username: string;
      email: string | null;
    }>(
      `SELECT
         evt.id as "tokenId",
         evt.usuario_id as "usuarioId",
         evt.expires_at as "expiresAt",
         evt.consumed_at as "consumedAt",
         u.username,
         u.email
       FROM email_verification_tokens evt
       INNER JOIN usuarios u ON u.id = evt.usuario_id
       WHERE evt.token_hash = $1
       LIMIT 1`,
      [tokenHash],
    );

    const record = rows[0];
    if (!record || record.consumedAt) {
      throw new BadRequestException('El enlace de verificacion no es valido o ya fue usado.');
    }

    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException('El enlace de verificacion ha caducado. Solicita uno nuevo.');
    }

    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE usuarios
         SET email_verified_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [record.usuarioId],
      );

      await client.query(
        `UPDATE email_verification_tokens
         SET consumed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [record.tokenId],
      );
    });

    return {
      username: record.username,
      email: record.email,
      message: 'Cuenta verificada correctamente.',
    };
  }

  async resendVerification(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new BadRequestException('El correo electronico es obligatorio.');
    }

    const user = await this.findUserByEmail(normalizedEmail);
    if (!user) {
      return {
        message: 'Si la cuenta existe, enviaremos un nuevo correo de verificacion.',
      };
    }

    if (user.emailVerifiedAt) {
      return {
        message: 'La cuenta ya esta verificada. Ya puedes iniciar sesion.',
      };
    }

    await this.sendVerificationEmail(user);
    return {
      message: 'Te hemos enviado un nuevo correo de verificacion.',
    };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new BadRequestException('El correo electronico es obligatorio.');
    }

    const user = await this.findUserByEmail(normalizedEmail);
    if (!user) {
      return {
        message: 'Si existe una cuenta asociada a ese correo, la solicitud de cambio de contraseña quedará pendiente de revisión.',
      };
    }

    const token = this.createRawToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = this.getFutureDateMinutes(this.getResetExpiryMinutes());

    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE password_reset_tokens
         SET consumed_at = CURRENT_TIMESTAMP
         WHERE usuario_id = $1 AND consumed_at IS NULL`,
        [user.id],
      );

      await client.query(
        `INSERT INTO password_reset_tokens (id, usuario_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [randomBytes(16).toString('hex'), user.id, tokenHash, expiresAt],
      );
    });

    return {
      message: 'Solicitud enviada. Un administrador o profesor revisará el cambio de contraseña.',
    };
  }

  async resetPassword(rawToken: string, nextPassword: string) {
    if (nextPassword.trim().length < 8) {
      throw new BadRequestException('La nueva contrasena debe tener al menos 8 caracteres.');
    }

    const tokenHash = this.hashToken(rawToken);
    const { rows } = await this.db.query<{
      tokenId: string;
      usuarioId: string;
      expiresAt: string;
      consumedAt: string | null;
    }>(
      `SELECT
         id as "tokenId",
         usuario_id as "usuarioId",
         expires_at as "expiresAt",
         consumed_at as "consumedAt"
       FROM password_reset_tokens
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash],
    );

    const record = rows[0];
    if (!record || record.consumedAt) {
      throw new BadRequestException('El enlace para restablecer la contrasena no es valido o ya fue usado.');
    }

    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException('El enlace para restablecer la contrasena ha caducado. Solicita uno nuevo.');
    }

    const hashedPassword = await hash(nextPassword, 10);

    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE usuarios
         SET password = $1
         WHERE id = $2`,
        [hashedPassword, record.usuarioId],
      );

      await client.query(
        `UPDATE password_reset_tokens
         SET consumed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [record.tokenId],
      );

      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE usuario_id = $1 AND revoked_at IS NULL`,
        [record.usuarioId],
      );
    });

    return {
      message: 'Contrasena actualizada correctamente.',
    };
  }

  async findUserByEmail(email: string) {
    const { rows } = await this.db.query<AccountEmailUser>(
      `SELECT
         id,
         username,
         nombre,
         apellidos,
         email,
         email_verified_at as "emailVerifiedAt"
       FROM usuarios
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email],
    );

    return rows[0] ?? null;
  }

  private createRawToken() {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getFrontendUrl() {
    const url = process.env.APP_FRONTEND_URL || 'http://localhost:8081';
    return url.replace(/\/$/, '');
  }

  private getVerifyExpiryHours() {
    return parseInt(process.env.VERIFY_EMAIL_EXPIRES_HOURS || '24', 10);
  }

  private getResetExpiryMinutes() {
    return parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES || '60', 10);
  }

  private getFutureDateHours(hours: number) {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  private getFutureDateMinutes(minutes: number) {
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }

  private getDisplayName(user: Pick<AccountEmailUser, 'username' | 'nombre' | 'apellidos'>) {
    const fullName = `${user.nombre ?? ''} ${user.apellidos ?? ''}`.trim();
    return fullName || user.username;
  }

  private normalizeEmail(value: string | null | undefined) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized || null;
  }
}