#!/usr/bin/env node
require('dotenv').config({ path: '.env' });

const { Client } = require('pg');

async function seedDemoRoles() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543', 10),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl: process.env.DB_SSL !== 'false'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false,
  });

  await client.connect();

  try {
    await client.query(`
      INSERT INTO usuarios (id, username, password, role, nombre, apellidos, email, email_verified_at)
      VALUES
        ('role-admin',    'admin',    '$2b$10$OD8yTnRl6ZX8pmgDIs5IluhRDay0h/EyZ0k5uueYxdeofNEhaW/uO', 'administrador', 'Admin',    'Demo', 'admin@smarteconomato.local',    NOW()),
        ('role-profesor', 'profesor', '$2b$10$u9qYcLUPnaIJGMhcd5ieeuCNRcMisI0mkF9Ym0DhQQ8j.1f6bC4g.', 'profesor',      'Profesor', 'Demo', 'profesor@smarteconomato.local', NOW()),
        ('role-alumno',   'alumno',   '$2b$10$B7KkOGKytAFIZTbpHQuvpezoA.sVDmtuB0Gwl93XzxSWY59ZVlJ0m', 'alumno',        'Alumno',   'Demo', 'alumno@smarteconomato.local',   NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        nombre = EXCLUDED.nombre,
        apellidos = EXCLUDED.apellidos,
        email = EXCLUDED.email,
        email_verified_at = NOW();
    `);

    console.log('seed_demo_roles=ok');
    console.log('usuarios_demo=admin,profesor,alumno');
  } finally {
    await client.end();
  }
}

seedDemoRoles().catch((error) => {
  console.error(`seed_demo_roles_error=${error.message}`);
  process.exit(1);
});
