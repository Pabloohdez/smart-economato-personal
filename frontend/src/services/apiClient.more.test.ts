import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiFetch } from './apiClient';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('incluye cabeceras JSON por defecto y parsea respuesta', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock as any);

    const res = await apiFetch('/api/test', { method: 'GET' });
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('lanza error en respuesta no ok', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'fail' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock as any);

    await expect(apiFetch('/api/bad', { method: 'GET' })).rejects.toBeTruthy();
  });
});

