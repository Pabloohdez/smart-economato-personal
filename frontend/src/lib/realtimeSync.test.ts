import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "./queryClient";
import { createRealtimeStreamUrl, setupRealtimeSync } from "./realtimeSync";

class MockBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null;

  close() {}

  postMessage() {}
}

class MockEventSource {
  static lastInstance: MockEventSource | null = null;

  readonly listeners = new Map<string, (event: MessageEvent<string>) => void>();
  readonly url: string;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.lastInstance = this;
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, listener);
  }

  emit(type: string, data: unknown) {
    this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

describe("realtimeSync", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("authToken", "jwt-demo");
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    vi.stubGlobal("EventSource", MockEventSource);
  });

  it("construye la URL del stream SSE con el token actual", () => {
    expect(createRealtimeStreamUrl("a b")).toContain("/api/realtime/stream?token=a%20b");
  });

  it("invalida las queries mapeadas cuando llega un evento del servidor", async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as any;

    const cleanup = setupRealtimeSync(queryClient);

    MockEventSource.lastInstance?.emit("invalidate", {
      keys: ["productos", "pedidosPendientes"],
    });

    await Promise.resolve();

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.productos });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.pedidosPendientes });

    cleanup();
  });

  it("si llega un payload inválido, invalida todas las queries live", async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    } as any;

    const cleanup = setupRealtimeSync(queryClient);

    // Emitimos un "invalidate" que no es JSON válido (forzamos el catch)
    MockEventSource.lastInstance?.listeners.get("invalidate")?.({ data: "no-json" } as any);

    await Promise.resolve();

    // En modo fallback invalida varias keys (no comprobamos todas, solo que se llamó)
    expect(queryClient.invalidateQueries).toHaveBeenCalled();

    cleanup();
  });
});