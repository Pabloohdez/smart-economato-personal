import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { LoginService } from './login.service';

describe('LoginService', () => {
  it('lanza Unauthorized si no existe el usuario', async () => {
    const db = {
      query: async () => ({ rows: [] }),
    } as any;

    const svc = new LoginService(db);
    await expect(svc.login('no-existe', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lanza Unauthorized si la contraseña no coincide (plaintext legacy)', async () => {
    const db = {
      query: async () => ({
        rows: [
          {
            id: 'u1',
            username: 'admin',
            password: 'secreto',
            email: null,
            emailVerifiedAt: null,
            role: 'admin',
            alergias: [],
          },
        ],
      }),
    } as any;

    const svc = new LoginService(db);
    await expect(svc.login('admin', 'mala')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lanza Forbidden si email existe y no está verificado', async () => {
    const db = {
      query: async () => ({
        rows: [
          {
            id: 'u1',
            username: 'admin',
            password: 'secreto',
            email: 'admin@example.com',
            emailVerifiedAt: null,
            role: 'admin',
            alergias: [],
          },
        ],
      }),
    } as any;

    const svc = new LoginService(db);
    await expect(svc.login('admin', 'secreto')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('devuelve usuario sin password si login OK', async () => {
    const db = {
      query: async () => ({
        rows: [
          {
            id: 'u1',
            username: 'admin',
            password: 'secreto',
            email: null,
            emailVerifiedAt: null,
            role: 'admin',
            alergias: ['Gluten'],
          },
        ],
      }),
    } as any;

    const svc = new LoginService(db);
    const user = await svc.login('admin', 'secreto');
    expect((user as any).password).toBeUndefined();
    expect((user as any).alergias).toEqual(['Gluten']);
  });
});

