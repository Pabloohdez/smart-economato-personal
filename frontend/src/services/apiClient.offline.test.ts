import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, flushOfflineQueue } from "./apiClient";
import { clearOfflineQueue, getOfflineQueue } from "./offlineQueue";

describe("apiClient offline queue", () => {
  beforeEach(() => {
    localStorage.clear();
    clearOfflineQueue();
    localStorage.setItem("authToken", "jwt-demo");
  });

  it("encola escrituras cuando no hay conexión", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });

    const response = await apiFetch<{ success: boolean; queued?: boolean; message?: string }>("/pedidos", {
      method: "POST",
      body: JSON.stringify({ demo: true }),
      offlineQueue: {
        enabled: true,
        queuedMessage: "Pedido en cola",
      },
    });

    expect(response).toMatchObject({ success: true, queued: true, message: "Pedido en cola" });
    expect(getOfflineQueue()).toHaveLength(1);
  });

  it("reenvía la cola cuando vuelve la conexión", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    });

    await apiFetch("/proveedores", {
      method: "POST",
      body: JSON.stringify({ nombre: "Demo" }),
      offlineQueue: {
        enabled: true,
        queuedMessage: "Proveedor en cola",
      },
    });

    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await flushOfflineQueue();

    expect(result).toEqual({ processed: 1, failed: 0, pending: 0 });
    expect(getOfflineQueue()).toHaveLength(0);
  });
});