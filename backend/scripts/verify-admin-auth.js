async function main() {
  const base = 'http://localhost:3000/api';

  const loginRes = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin_demo', password: 'AdminDemo123' }),
  });

  let token = null;
  if (loginRes.ok) {
    const loginJson = await loginRes.json();
    token = loginJson?.data?.token || null;
    console.log('admin_login=ok');
  } else {
    console.log(`admin_login_status=${loginRes.status}`);
  }

  if (!token) {
    return;
  }

  const adminRes = await fetch(`${base}/usuarios?id=admin_demo`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`admin_route_status=${adminRes.status}`);
}

main().catch((error) => {
  console.error(`admin_verify_error=${error.message}`);
  process.exit(1);
});
