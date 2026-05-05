#!/usr/bin/env node
require('dotenv').config({ path: '.env' });

const { Client } = require('pg');
const bcryptjs = require('bcryptjs');

async function checkAndCreateAdmin() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl: process.env.DB_SSL !== 'false' ? 
      { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' } : 
      false,
  });

  try {
    await client.connect();
    console.log('✓ Conectado a BD');

    // Verificar si admin_demo existe
    const existResult = await client.query(
      'SELECT id, username, password, role FROM usuarios WHERE username = $1',
      ['admin_demo']
    );

    if (existResult.rows.length > 0) {
      const user = existResult.rows[0];
      console.log(`✓ Usuario admin_demo existe:`, {
        id: user.id,
        username: user.username,
        role: user.role,
        passwordLength: user.password?.length || 0,
        isHashed: user.password?.startsWith('$2') || false,
      });
    } else {
      console.log('✗ Usuario admin_demo NO existe. Creando...');
      
      const hashedPassword = await bcryptjs.hash('AdminDemo123', 10);
      
      const insertResult = await client.query(
        `INSERT INTO usuarios (username, password, nombre, email, role, activo) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, username, role`,
        ['admin_demo', hashedPassword, 'Admin Demo', 'admin@demo.local', 'admin', true]
      );

      console.log(`✓ Usuario admin_demo creado:`, insertResult.rows[0]);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAndCreateAdmin();
