import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const getResponse = () => ({ status } as any);
  const getRequest = () => ({ method: 'GET', originalUrl: '/api/test' } as any);

  const host = {
    switchToHttp: () => ({
      getResponse,
      getRequest,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  it('formatea HttpException con status y mensaje', () => {
    const { host, status, json } = createHost();
    const filter = new AllExceptionsFilter();
    const exc = new HttpException({ message: 'No autorizado' }, HttpStatus.UNAUTHORIZED);

    filter.catch(exc, host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'No autorizado', code: 401 },
    });
  });

  it('formatea error genérico como 500', () => {
    const { host, status, json } = createHost();
    const filter = new AllExceptionsFilter();
    const exc = new Error('Boom');

    filter.catch(exc, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Boom', code: 500 },
    });
  });
});

