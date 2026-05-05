import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const previousEnv = { ...process.env };
  const db = {
    query: jest.fn(),
    transaction: jest.fn(),
  };

  beforeEach(() => {
    process.env = {
      ...previousEnv,
      JWT_SECRET: '12345678901234567890123456789012',
      JWT_EXPIRES_IN: '8h',
      JWT_REFRESH_EXPIRES_IN: '30d',
    };
    db.query.mockReset();
    db.transaction.mockReset();
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it('firma y verifica un token válido', () => {
    const service = new AuthService(db as never);

    const token = service.signToken({
      id: 'u1',
      username: 'admin',
      role: 'admin',
      nombre: 'Administrador',
    });

    const payload = service.verifyToken(token);

    expect(payload.sub).toBe('u1');
    expect(payload.username).toBe('admin');
    expect(payload.role).toBe('admin');
  });

  it('rechaza secretos inseguros por defecto', () => {
    process.env.JWT_SECRET = 'secret';

    expect(() => new AuthService(db as never)).toThrow('JWT_SECRET demasiado corto');
  });

  it('extrae correctamente el bearer token', () => {
    const service = new AuthService(db as never);

    expect(service.extractBearerToken('Bearer abc.def')).toBe('abc.def');
    expect(service.extractBearerToken('Basic abc')).toBeNull();
    expect(service.extractBearerToken()).toBeNull();
  });

  it('lanza UnauthorizedException cuando el token no es válido', () => {
    const service = new AuthService(db as never);

    expect(() => service.verifyToken('token-invalido')).toThrow(UnauthorizedException);
  });

  it('firma y verifica un refresh token válido', () => {
    const service = new AuthService(db as never);

    const refreshToken = service.signRefreshToken({
      id: 'u1',
      username: 'admin',
      role: 'admin',
      nombre: 'Administrador',
    });

    const payload = service.verifyRefreshToken(refreshToken);

    expect(payload.sub).toBe('u1');
    expect(payload.tokenType).toBe('refresh');
  });
});