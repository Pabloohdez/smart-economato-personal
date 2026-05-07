import { createHash, randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { AuthTokenPayload } from './auth.types';
import { DatabaseService } from '../database/database.service';

type TokenUser = {
  id: string | number;
  username: string;
  role?: string | null;
  nombre?: string | null;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;
  private readonly expiresIn: SignOptions['expiresIn'];
  private readonly refreshExpiresIn: SignOptions['expiresIn'];
  private readonly maxSessionAgeMs: number;

  private static readonly INSECURE_DEFAULTS = [
    'cambia_esto_por_un_secreto_largo_y_aleatorio',
    'changeme',
    'secret',
    'jwt_secret',
  ];

  constructor(private readonly db: DatabaseService) {
    const secret = this.requiredEnv('JWT_SECRET');
    if (secret.length < 32) {
      throw new Error(
        'JWT_SECRET demasiado corto (mínimo 32 caracteres). Genera uno seguro con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
      );
    }
    if (AuthService.INSECURE_DEFAULTS.includes(secret.toLowerCase())) {
      throw new Error(
        'JWT_SECRET tiene un valor por defecto inseguro. Cámbialo por un secreto único y aleatorio.',
      );
    }
    this.jwtSecret = secret;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || `${secret}-refresh`;
    this.expiresIn = (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'];
    this.refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as SignOptions['expiresIn'];
    this.maxSessionAgeMs = parseInt(process.env.JWT_SESSION_MAX_AGE_MS || String(12 * 60 * 60 * 1000), 10);
  }

  signToken(user: TokenUser): string {
    return sign(
      {
        sub: String(user.id),
        jti: randomBytes(12).toString('hex'),
        username: user.username,
        role: user.role ?? 'usuario',
        nombre: user.nombre ?? null,
        tokenType: 'access',
      },
      this.jwtSecret,
      { expiresIn: this.expiresIn },
    );
  }

  signRefreshToken(user: TokenUser, sessionIat: number): string {
    return sign(
      {
        sub: String(user.id),
        jti: randomBytes(12).toString('hex'),
        username: user.username,
        role: user.role ?? 'usuario',
        nombre: user.nombre ?? null,
        tokenType: 'refresh',
        sessionIat,
      },
      this.refreshSecret,
      { expiresIn: this.refreshExpiresIn },
    );
  }

  async issueSessionTokens(user: TokenUser) {
    const token = this.signToken(user);
    const sessionIat = Math.floor(Date.now() / 1000);
    const refreshToken = this.signRefreshToken(user, sessionIat);
    const refreshPayload = this.verifyRefreshToken(refreshToken);
    await this.persistRefreshToken(String(user.id), refreshToken, refreshPayload.exp);

    return { token, refreshToken };
  }

  async rotateRefreshToken(refreshToken: string, user: TokenUser) {
    const payload = this.verifyRefreshToken(refreshToken);
    const sessionIat = payload.sessionIat ?? payload.iat ?? Math.floor(Date.now() / 1000);
    const ageMs = Date.now() - sessionIat * 1000;
    if (this.maxSessionAgeMs > 0 && ageMs > this.maxSessionAgeMs) {
      // El cliente tendrá que re-autenticarse.
      await this.revokeRefreshToken(refreshToken);
      throw new UnauthorizedException('Sesión caducada');
    }
    const tokenHash = this.hashToken(refreshToken);

    const { rows } = await this.db.query<{
      id: string;
      expiresAt: string;
      rotatedAt: string | null;
      revokedAt: string | null;
    }>(
      `SELECT id, expires_at as "expiresAt", rotated_at as "rotatedAt", revoked_at as "revokedAt"
       FROM refresh_tokens
       WHERE token_hash = $1 AND usuario_id = $2
       LIMIT 1`,
      [tokenHash, payload.sub],
    );

    const current = rows[0];
    if (!current || current.revokedAt || current.rotatedAt) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (new Date(current.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    return this.db.transaction(async (client) => {
      await client.query(
        'UPDATE refresh_tokens SET rotated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [current.id],
      );

      const nextToken = this.signToken(user);
      const nextRefreshToken = this.signRefreshToken(user, sessionIat);
      const nextRefreshPayload = this.verifyRefreshToken(nextRefreshToken);

      await client.query(
        `INSERT INTO refresh_tokens (id, usuario_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [
          randomBytes(16).toString('hex'),
          String(user.id),
          this.hashToken(nextRefreshToken),
          this.expiryFromEpoch(nextRefreshPayload.exp),
        ],
      );

      return { token: nextToken, refreshToken: nextRefreshToken };
    });
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      const payload = verify(token, this.jwtSecret);
      if (
        typeof payload !== 'object'
        || payload == null
        || typeof payload.sub !== 'string'
        || payload.tokenType !== 'access'
      ) {
        throw new UnauthorizedException('Token inválido');
      }
      return payload as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  verifyRefreshToken(token: string): AuthTokenPayload {
    try {
      const payload = verify(token, this.refreshSecret);
      if (
        typeof payload !== 'object'
        || payload == null
        || typeof payload.sub !== 'string'
        || payload.tokenType !== 'refresh'
      ) {
        throw new UnauthorizedException('Refresh token inválido');
      }
      return payload as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  extractBearerToken(headerValue?: string): string | null {
    if (!headerValue) return null;
    const [scheme, token] = headerValue.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token.trim();
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private expiryFromEpoch(exp?: number): string {
    if (!exp) {
      throw new UnauthorizedException('Token sin expiración válida');
    }
    return new Date(exp * 1000).toISOString();
  }

  private async persistRefreshToken(userId: string, refreshToken: string, exp?: number) {
    await this.db.query(
      `INSERT INTO refresh_tokens (id, usuario_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [
        randomBytes(16).toString('hex'),
        userId,
        this.hashToken(refreshToken),
        this.expiryFromEpoch(exp),
      ],
    );
  }

  async revokeRefreshToken(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    await this.db.query(
      `UPDATE refresh_tokens
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE usuario_id = $1 AND token_hash = $2 AND revoked_at IS NULL`,
      [payload.sub, tokenHash],
    );
  }
}
