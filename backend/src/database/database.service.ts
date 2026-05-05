import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Conexión a PostgreSQL en Supabase (remoto).
 * No se usa base de datos local; toda la persistencia está en Supabase.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor() {
    const host = process.env.DB_HOST || 'aws-1-eu-west-1.pooler.supabase.com';
    const port = parseInt(process.env.DB_PORT || '6543', 10);
    const database = process.env.DB_NAME || 'postgres';
    const user = this.requiredEnv('DB_USER');
    const password = this.requiredEnv('DB_PASS');
    const sslEnabled = process.env.DB_SSL !== 'false';
    const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

    this.pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      max: 10,
      // Supabase exige SSL para el pooler (puerto 6543)
      ssl: sslEnabled ? { rejectUnauthorized } : undefined,
    });
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }> {
    const result = await this.pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  }

  async transaction<T>(
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
