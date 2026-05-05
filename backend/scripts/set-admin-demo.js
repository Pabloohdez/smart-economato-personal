const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'aws-1-eu-west-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.tolmfuusklacewxcvwqj',
    password: 'dfbZGsDR0LVppIPZ',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const result = await client.query("UPDATE usuarios SET role = 'admin' WHERE username = 'admin_demo'");
  console.log(`admin_update_rows=${result.rowCount}`);
  await client.end();
}

main().catch((error) => {
  console.error(`admin_update_error=${error.message}`);
  process.exit(1);
});
