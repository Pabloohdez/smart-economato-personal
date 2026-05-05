# Diagramas — Smart Economato

## 1) Contexto (C4 — Nivel 1)

```mermaid
flowchart LR
  U[Usuarios (web)] -->|HTTPS| FE[Frontend React]
  FE -->|/api| BE[Backend NestJS]
  BE -->|SQL (SSL)| DB[(Supabase Postgres)]
  BE -->|SMTP / log| MAIL[Servicio de correo]
```

## 2) Contenedores (C4 — Nivel 2)

```mermaid
flowchart TB
  subgraph Docker["Docker / entorno"]
    FE[Frontend (Vite/nginx)]
    BE[API (NestJS)]
  end
  DB[(Supabase Postgres - remoto)]

  FE -->|Proxy /api| BE
  BE -->|SSL| DB
```

## 3) Secuencia (login → refresh)

```mermaid
sequenceDiagram
  participant C as Cliente (Frontend)
  participant A as API (NestJS)
  participant D as DB (Supabase)

  C->>A: POST /api/login {username,password}
  A->>D: SELECT usuario + hash
  D-->>A: usuario
  A-->>C: {token, refreshToken, user}

  C->>A: POST /api/login/refresh {refreshToken}
  A->>D: validar/rotar refresh token
  D-->>A: OK
  A-->>C: {token nuevo, refreshToken nuevo}
```

