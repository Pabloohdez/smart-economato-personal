import { hash } from 'bcryptjs';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { LoginController } from '../src/login/login.controller';
import { LoginService } from '../src/login/login.service';
import { AuthService } from '../src/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';
import { ResponseInterceptor } from '../src/common/response.interceptor';
import { AccountSecurityService } from '../src/auth/account-security.service';

type StoredUser = {
  id: string;
  username: string;
  password: string;
  nombre: string;
  apellidos: string;
  email: string;
  emailVerifiedAt?: string | null;
  telefono: string;
  role: string;
  alergias: string[];
};

type StoredRefreshToken = {
  id: string;
  usuario_id: string;
  token_hash: string;
  expires_at: string;
  rotated_at: string | null;
  revoked_at: string | null;
};

class FakeDatabaseService {
  users: StoredUser[] = [];
  refreshTokens: StoredRefreshToken[] = [];

  async query(text: string, params: unknown[] = []) {
    const sql = text.replace(/\s+/g, ' ').trim();

    if (sql.includes('FROM usuarios u')) {
      const value = String(params[0] ?? '');
      const user = this.users.find((item) => item.username === value || item.id === value);
      if (!user) return { rows: [], rowCount: 0 };
      return {
        rows: [
          {
            id: user.id,
            username: user.username,
            password: user.password,
            nombre: user.nombre,
            apellidos: user.apellidos,
            email: user.email,
            emailVerifiedAt: user.emailVerifiedAt ?? null,
            telefono: user.telefono,
            role: user.role,
            alergias: user.alergias,
          },
        ],
        rowCount: 1,
      };
    }

    if (sql.startsWith('INSERT INTO refresh_tokens')) {
      this.refreshTokens.push({
        id: String(params[0]),
        usuario_id: String(params[1]),
        token_hash: String(params[2]),
        expires_at: String(params[3]),
        rotated_at: null,
        revoked_at: null,
      });
      return { rows: [], rowCount: 1 };
    }

    if (sql.includes('FROM refresh_tokens')) {
      const tokenHash = String(params[0] ?? '');
      const userId = String(params[1] ?? '');
      const token = this.refreshTokens.find(
        (item) => item.token_hash === tokenHash && item.usuario_id === userId,
      );
      if (!token) return { rows: [], rowCount: 0 };
      return {
        rows: [
          {
            id: token.id,
            expiresAt: token.expires_at,
            rotatedAt: token.rotated_at,
            revokedAt: token.revoked_at,
          },
        ],
        rowCount: 1,
      };
    }

    if (sql.startsWith('UPDATE refresh_tokens SET rotated_at')) {
      const tokenId = String(params[0] ?? '');
      const token = this.refreshTokens.find((item) => item.id === tokenId);
      if (token) {
        token.rotated_at = new Date().toISOString();
      }
      return { rows: [], rowCount: token ? 1 : 0 };
    }

    throw new Error(`Query no soportada en fake DB: ${sql}`);
  }

  async transaction<T>(fn: (client: { query: FakeDatabaseService['query'] }) => Promise<T>) {
    return fn({ query: this.query.bind(this) });
  }
}

describe('Refresh token cycle (e2e)', () => {
  let app: INestApplication;
  let fakeDb: FakeDatabaseService;

  const previousEnv = { ...process.env };

  beforeAll(async () => {
    process.env = {
      ...previousEnv,
      JWT_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdef',
      JWT_EXPIRES_IN: '8h',
      JWT_REFRESH_EXPIRES_IN: '30d',
    };

    fakeDb = new FakeDatabaseService();
    fakeDb.users = [
      {
        id: 'user-1',
        username: 'admin',
        password: await hash('secreto', 10),
        nombre: 'Administrador',
        apellidos: 'Demo',
        email: 'admin@example.com',
        emailVerifiedAt: new Date().toISOString(),
        telefono: '600000000',
        role: 'admin',
        alergias: ['Gluten'],
      },
    ];

    const moduleRef = await Test.createTestingModule({
      controllers: [LoginController],
      providers: [
        LoginService,
        AuthService,
        {
          provide: DatabaseService,
          useValue: fakeDb,
        },
        {
          provide: AccountSecurityService,
          useValue: {
            sendVerificationEmail: async () => ({ deliveryMode: 'log' }),
            verifyAccount: async () => ({ message: 'ok' }),
            resendVerification: async () => ({ message: 'ok' }),
            requestPasswordReset: async () => ({ message: 'ok' }),
            resetPassword: async () => ({ message: 'ok' }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Necesario para leer cookies en /login/refresh cuando usemos cookie-based auth.
    app.use(cookieParser());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  beforeEach(() => {
    fakeDb.refreshTokens = [];
  });

  afterAll(async () => {
    process.env = previousEnv;
    if (app) {
      await app.close();
    }
  });

  it('completa login, rota el refresh token y rechaza reutilizar el antiguo', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/login')
      .send({ username: 'admin', password: 'secreto' })
      .expect(201);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.user.alergias).toEqual(['Gluten']);

    const loginSetCookie = loginResponse.headers['set-cookie'] as unknown;
    const loginCookies = Array.isArray(loginSetCookie)
      ? (loginSetCookie as string[])
      : typeof loginSetCookie === 'string'
        ? [loginSetCookie]
        : [];
    expect(loginCookies.length > 0).toBe(true);

    const firstAccessCookie = (loginCookies ?? []).find((c) => c.startsWith('accessToken='));
    const firstRefreshCookie = (loginCookies ?? []).find((c) => c.startsWith('refreshToken='));
    expect(firstAccessCookie).toBeTruthy();
    expect(firstRefreshCookie).toBeTruthy();

    const firstAccessToken = String(firstAccessCookie).split(';')[0].split('=')[1];
    const firstRefreshToken = String(firstRefreshCookie).split(';')[0].split('=')[1];
    expect(firstAccessToken).toBeTruthy();
    expect(firstRefreshToken).toBeTruthy();

    const refreshResponse = await request(app.getHttpServer())
      .post('/login/refresh')
      // preferimos cookie-based refresh para simular navegador real
      .set('Cookie', [`refreshToken=${firstRefreshToken}`])
      .expect(201);

    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.user.alergias).toEqual(['Gluten']);

    const refreshSetCookie = refreshResponse.headers['set-cookie'] as unknown;
    const refreshCookies = Array.isArray(refreshSetCookie)
      ? (refreshSetCookie as string[])
      : typeof refreshSetCookie === 'string'
        ? [refreshSetCookie]
        : [];
    const nextAccessCookie = (refreshCookies ?? []).find((c) => c.startsWith('accessToken='));
    const nextRefreshCookie = (refreshCookies ?? []).find((c) => c.startsWith('refreshToken='));
    expect(nextAccessCookie).toBeTruthy();
    expect(nextRefreshCookie).toBeTruthy();

    const nextAccessToken = String(nextAccessCookie).split(';')[0].split('=')[1];
    const nextRefreshToken = String(nextRefreshCookie).split(';')[0].split('=')[1];
    expect(nextAccessToken).toBeTruthy();
    expect(nextRefreshToken).toBeTruthy();
    expect(nextAccessToken).not.toBe(firstAccessToken);
    expect(nextRefreshToken).not.toBe(firstRefreshToken);

    await request(app.getHttpServer())
      .post('/login/refresh')
      .set('Cookie', [`refreshToken=${firstRefreshToken}`])
      .expect(401);
  });
});