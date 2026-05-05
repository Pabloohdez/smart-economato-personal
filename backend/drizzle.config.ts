import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'aws-1-eu-west-1.pooler.supabase.com',
    port: Number(process.env.DB_PORT || '6543'),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'false' ? false : true,
  },
});