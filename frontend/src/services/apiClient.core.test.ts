import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, flushOfflineQueue } from "./apiClient";
import { getOfflineQueue } from "./offlineQueue";

describe("apiClient (core)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    // Por defecto online
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("si está offline y offlineQueue.enabled=true, devuelve respuesta encolada", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    const res = await apiFetch<any>("/pedidos", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
      offlineQueue: { enabled: true, queuedMessage: "OK en cola" },
    });

    expect(res.queued).toBe(true);
    expect(getOfflineQueue().length).toBe(1);
    expect(getOfflineQueue()[0].path).toBe("/pedidos");
  });

  it("sanitiza /bajas eliminando usuarioId del body", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(body).toContain("motivo");
      expect(body).not.toContain("usuarioId");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock as any);

    await apiFetch<any>("/bajas", {
      method: "POST",
      body: JSON.stringify({ motivo: "rotura", usuarioId: "admin1" }),
    });
  });

  it("flushOfflineQueue procesa elementos encolados (online)", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    await apiFetch<any>("/pedidos", {
      method: "POST",
      body: JSON.stringify({ x: 1 }),
      offlineQueue: { enabled: true },
    });
    expect(getOfflineQueue().length).toBe(1);

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock as any);

    const result = await flushOfflineQueue();
    expect(result.processed).toBe(1);
    expect(getOfflineQueue().length).toBe(0);
  });
});

