import { Global, Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DatabaseService } from './database.service';
import { schema } from './schema';

@Global()
@Injectable()
export class DrizzleService {
  readonly db;

  constructor(private readonly database: DatabaseService) {
    this.db = drizzle(this.database.getPool(), { schema });
  }
}