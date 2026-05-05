import { firstValueFrom, timeout } from 'rxjs';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  const authService = {
    verifyToken: jest.fn(() => ({ sub: '1', username: 'admin', tokenType: 'access' })),
  } as any;

  beforeEach(() => {
    authService.verifyToken.mockClear();
  });

  it('verifica el token al conectar al stream', () => {
    const service = new RealtimeService(authService);

    service.connect('jwt-demo');

    expect(authService.verifyToken).toHaveBeenCalledWith('jwt-demo');
  });

  it('emite invalidaciones publicadas a los clientes conectados', async () => {
    const service = new RealtimeService(authService);
    const eventPromise = firstValueFrom(service.connect('jwt-demo').pipe(timeout(1000)));

    service.publish(['productos', 'pedidos'], 'test');

    await expect(eventPromise).resolves.toMatchObject({
      type: 'invalidate',
      data: {
        keys: ['productos', 'pedidos'],
        source: 'test',
      },
    });
  });
});