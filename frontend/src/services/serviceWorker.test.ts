import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./serviceWorker";

describe("serviceWorker", () => {
  it("registra el service worker al cargar la página en producción", async () => {
    const handlers = new Map<string, () => void>();
    const register = vi.fn().mockResolvedValue(undefined);

    registerServiceWorker(
      {
        addEventListener: (event: string, callback: EventListenerOrEventListenerObject) => {
          handlers.set(event, callback as () => void);
        },
      } as unknown as Window,
      {
        serviceWorker: {
          register,
        },
      } as unknown as Navigator,
      true,
    );

    handlers.get("load")?.();
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("en desarrollo desregistra SWs antiguos y limpia caches", async () => {
    const handlers = new Map<string, () => void>();
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);

    const keys = vi.fn().mockResolvedValue(["a", "b"]);
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { keys, delete: del } as any);

    registerServiceWorker(
      {
        addEventListener: (event: string, callback: EventListenerOrEventListenerObject) => {
          handlers.set(event, callback as () => void);
        },
      } as unknown as Window,
      {
        serviceWorker: {
          getRegistrations,
        },
      } as unknown as Navigator,
      false,
    );

    handlers.get("load")?.();
    // Espera a que se resuelva la cadena de Promises del cleanup defensivo.
    await new Promise((r) => setTimeout(r, 0));

    expect(getRegistrations).toHaveBeenCalled();
    expect(unregister).toHaveBeenCalled();
    expect(keys).toHaveBeenCalled();
    expect(del).toHaveBeenCalledWith("a");
    expect(del).toHaveBeenCalledWith("b");
  });
});