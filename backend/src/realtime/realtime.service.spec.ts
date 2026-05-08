import { firstValueFrom, timeout } from 'rxjs';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  it('emite invalidaciones publicadas a los clientes conectados', async () => {
    const service = new RealtimeService();
    const eventPromise = firstValueFrom(service.connect().pipe(timeout(1000)));

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