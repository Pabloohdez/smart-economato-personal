import { MovimientosService } from './movimientos.service';

describe('MovimientosService', () => {
  it('actualiza stock y registra auditoría al crear una salida', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ stock: 10 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ nombre: 'Leche' }] }),
    };

    const db = {
      query: jest.fn(),
      transaction: jest.fn(async (fn: (value: typeof client) => Promise<unknown>) => fn(client)),
    };

    const auditoria = {
      registrar: jest.fn().mockResolvedValue(undefined),
    };

    const service = new MovimientosService(db as never, auditoria as never);

    const result = await service.crear(
      {
        productoId: 'prod-1',
        cantidad: 3,
        tipo: 'SALIDA',
        motivo: 'Cocina',
        usuarioId: 'user-1',
      },
      '127.0.0.1',
    );

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenNthCalledWith(
      1,
      'SELECT stock FROM productos WHERE id = $1 FOR UPDATE',
      ['prod-1'],
    );
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO movimientos'),
      ['prod-1', 'user-1', 'SALIDA', 3, 10, 7, 'Cocina'],
    );
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      'UPDATE productos SET stock = $1 WHERE id = $2',
      [7, 'prod-1'],
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      'user-1',
      null,
      'MOVIMIENTO',
      'movimiento',
      null,
      expect.objectContaining({
        tipo: 'SALIDA',
        producto: 'Leche',
        cantidad: 3,
        motivo: 'Cocina',
        stock_anterior: 10,
        stock_nuevo: 7,
      }),
      '127.0.0.1',
    );
    expect(result).toEqual({ message: 'Movimiento registrado', stock_nuevo: 7 });
  });

  it('pagina correctamente la consulta de movimientos', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({
        rows: [{ cantidad: '5', tipo: 'ENTRADA' }],
      }),
      transaction: jest.fn(),
    };

    const auditoria = { registrar: jest.fn() };
    const service = new MovimientosService(db as never, auditoria as never);

    const result = await service.findAll(2, 25);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1 OFFSET $2'), [25, 25]);
    expect(result).toEqual([{ cantidad: 5, tipo: 'ENTRADA' }]);
  });
});