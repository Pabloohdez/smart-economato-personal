import { QueryClient, type QueryKey } from "@tanstack/react-query";
import { queryKeys } from "./queryClient";
import { API_URL } from "../services/apiClient";
import { getToken } from "../services/sessionService";

const CHANNEL_NAME = "smart-economato-sync";
const REFRESH_INTERVAL_MS = 60_000;
const SSE_RECONNECT_MS = 5_000;

const liveQueryKeys: QueryKey[] = [
  queryKeys.productos,
  queryKeys.categorias,
  queryKeys.proveedores,
  queryKeys.pedidos,
  queryKeys.pedidosPendientes,
  queryKeys.informesGastosMensuales,
  queryKeys.rendimientosHistorial,
  queryKeys.escandallos,
  queryKeys.misAlergias,
];

const liveQueryMap: Record<string, QueryKey> = {
  productos: queryKeys.productos,
  categorias: queryKeys.categorias,
  proveedores: queryKeys.proveedores,
  pedidos: queryKeys.pedidos,
  pedidosPendientes: queryKeys.pedidosPendientes,
  informesGastosMensuales: queryKeys.informesGastosMensuales,
  rendimientosHistorial: queryKeys.rendimientosHistorial,
  escandallos: queryKeys.escandallos,
  misAlergias: queryKeys.misAlergias,
};

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(CHANNEL_NAME);
}

export async function invalidateLiveQueries(queryClient: QueryClient, queryKey?: QueryKey) {
  if (queryKey) {
    await queryClient.invalidateQueries({ queryKey });
    return;
  }

  await Promise.all(
    liveQueryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
  );
}

export function broadcastQueryInvalidation(queryKey?: QueryKey) {
  const channel = getChannel();
  if (!channel) return;

  channel.postMessage({ type: "invalidate", queryKey: queryKey ?? null });
  channel.close();
}

export function createRealtimeStreamUrl(token: string) {
  const baseUrl = API_URL.startsWith("http")
    ? API_URL
    : `${window.location.origin}${API_URL}`;

  return `${baseUrl}/realtime/stream?token=${encodeURIComponent(token)}`;
}

async function invalidateKeysFromEvent(queryClient: QueryClient, keys: string[]) {
  const targets = keys
    .map((key) => liveQueryMap[key])
    .filter(Boolean);

  if (targets.length === 0) {
    await invalidateLiveQueries(queryClient);
    return;
  }

  await Promise.all(targets.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function setupRealtimeSync(queryClient: QueryClient) {
  const channel = getChannel();
  let eventSource: EventSource | null = null;
  let reconnectTimer: number | null = null;

  const connectToSse = () => {
    const token = getToken();
    if (!token || typeof EventSource === "undefined" || eventSource) {
      return;
    }

    eventSource = new EventSource(createRealtimeStreamUrl(token));
    eventSource.addEventListener("invalidate", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as { keys?: string[] };
        void invalidateKeysFromEvent(queryClient, payload.keys ?? []);
      } catch {
        void invalidateLiveQueries(queryClient);
      }
    });
    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;

      if (reconnectTimer == null) {
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          connectToSse();
        }, SSE_RECONNECT_MS);
      }
    };
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") {
      connectToSse();
      void invalidateLiveQueries(queryClient);
    }
  };

  const onOnline = () => {
    connectToSse();
    void invalidateLiveQueries(queryClient);
  };

  const onStorage = () => {
    eventSource?.close();
    eventSource = null;
    connectToSse();
  };

  const timer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void invalidateLiveQueries(queryClient);
    }
  }, REFRESH_INTERVAL_MS);

  connectToSse();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  window.addEventListener("storage", onStorage);

  if (channel) {
    channel.onmessage = (event) => {
      if (event.data?.type !== "invalidate") return;
      void invalidateLiveQueries(queryClient, event.data.queryKey ?? undefined);
    };
  }

  return () => {
    window.clearInterval(timer);
    if (reconnectTimer != null) {
      window.clearTimeout(reconnectTimer);
    }
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("storage", onStorage);
    eventSource?.close();
    channel?.close();
  };
}