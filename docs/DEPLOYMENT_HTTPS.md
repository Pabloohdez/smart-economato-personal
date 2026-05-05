# Despliegue y HTTPS — Smart Economato

## 1. Despliegue con Docker (local / servidor)

En la raíz del proyecto:

- Desarrollo:
  - `docker compose up --build`
  - Frontend: `http://localhost:8081`
  - API: `http://localhost:3000/api`

- “Producción” (perfil `prod`):
  - `docker compose --profile prod up --build -d`
  - Frontend: `http://localhost:8081` (sirviendo estático)
  - API: `http://localhost:3000/api`

### Variables de entorno

- Backend: `backend/.env` (ver `backend/.env.example`)
- Base de datos: PostgreSQL en **Supabase** (remoto). La conexión usa **SSL**.

## 2. HTTPS (recomendado en despliegue real)

El `docker-compose.yml` actual no configura TLS/HTTPS. En un despliegue real, lo habitual es poner un **reverse proxy** delante.

### Opción A: Caddy (simple, auto-HTTPS con Let’s Encrypt)

1. Crear un `Caddyfile` en el servidor (ejemplo conceptual):

```text
tu-dominio.com {
  reverse_proxy /api/* localhost:3000
  reverse_proxy localhost:8081
}
```

2. Publicar solo el puerto 80/443 del reverse proxy.
3. Configurar DNS del dominio apuntando al servidor.

### Opción B: Nginx (más control)

- Terminar TLS en Nginx y hacer proxy a:
  - `frontend_prod` (puerto 8081 → 80 dentro del contenedor) o al servicio dev si procede
  - `api` (puerto 3000)

## 3. Checklist mínimo para “entrega/despliegue”

- [ ] Dominio y DNS configurados
- [ ] TLS habilitado (Caddy/Nginx)
- [ ] Variables de entorno configuradas en el servidor (sin commitearlas)
- [ ] Healthcheck `/api/health` accesible
- [ ] Logs y reinicio automático (systemd / docker restart policy)

