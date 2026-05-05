import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthSchemaService implements OnModuleInit {
  private readonly logger = new Logger(AuthSchemaService.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    await this.ensureSchema();
  }

  private async ensureSchema() {
    await this.db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`);
    await this.db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP`);

    await this.db.query(
      `CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id VARCHAR(64) PRIMARY KEY,
        usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        consumed_at TIMESTAMP
      )`,
    );

    await this.db.query(
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(64) PRIMARY KEY,
        usuario_id VARCHAR(50) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        consumed_at TIMESTAMP
      )`,
    );

    await this.db.query(
      `UPDATE usuarios
       SET email_verified_at = CURRENT_TIMESTAMP
       WHERE email IS NOT NULL
         AND email_verified_at IS NULL
         AND verification_sent_at IS NULL`,
    );

    this.logger.log('Esquema de verificacion y recuperacion de cuenta asegurado.');
  }
}