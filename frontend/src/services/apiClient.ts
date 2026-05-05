import { clearSession, getRefreshToken, getStoredUser, getToken, saveSession } from "./sessionService";
import {
  enqueueOfflineRequest,
  getOfflineQueue,
  notifyOfflineQueueFlushed,
  replaceOfflineQueue,
} from "./offlineQueue";

export const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";

type ApiError = {
  error?: string | { message?: string; code?: number };
  message?: string;
  [key: string]: unknown;
};

export type ApiRequestError = Error & {
  status?: number;
  payload?: unknown;
};

export type ApiFetchOptions = RequestInit & {
  offlineQueue?: {
    enabled?: boolean;
    queuedMessage?: string;
    optimisticResponse?: unknown;
  };
};

let refreshPromise: Promise<boolean> | null = null;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, String(value)]));
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)]),
  );
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && !("status" in error));
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function createTimedAbortSignal(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const onExternalAbort = () => {
    controller.abort();
  };

  if (externalSignal?.aborted) {
    controller.abort();
  } else if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort);
  }

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    },
  };
}

function extractApiErrorMessage(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const errObj = data as ApiError;
    if (typeof errObj.message === "string" && errObj.message.trim()) {
      return errObj.message;
    }

    if (typeof errObj.error === "string" && errObj.error.trim()) {
      return errObj.error;
    }

    if (typeof errObj.error === "object" && errObj.error !== null) {
      const nestedMessage = (errObj.error as { message?: unknown }).message;
      if (typeof nestedMessage === "string" && nestedMessage.trim()) {
        return nestedMessage;
      }
    }
  }

  return `HTTP ${status}`;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  const user = getStoredUser();

  if (!refreshToken || !user) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { signal, cleanup } = createTimedAbortSignal(DEFAULT_REQUEST_TIMEOUT_MS);
      let res: Response;

      try {
        res = await fetch(`${API_URL}/login/refresh`, {
          method: "POST",
          cache: "no-store",
          signal,
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        if (isAbortError(error)) {
          clearSession();
          return false;
        }

        throw error;
      } finally {
        cleanup();
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok || !data?.success || !data?.data?.token || !data?.data?.user) {
        clearSession();
        return false;
      }

      saveSession(data.data.token, data.data.user, data.data.refreshToken);
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function executeApiRequest<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const url = `${API_URL}${path}`;
  const token = getToken();
  const optionHeaders = (options.headers ?? {}) as HeadersInit;
  const method = String(options.method ?? "GET").toUpperCase();
  const { signal: callerSignal, cache: callerCache, ...requestOptions } = options;
  const { signal, cleanup } = createTimedAbortSignal(DEFAULT_REQUEST_TIMEOUT_MS, callerSignal ?? undefined);
  let res: Response;

  try {
    res = await fetch(url, {
      ...requestOptions,
      cache: callerCache ?? (method === "GET" ? "no-store" : undefined),
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...optionHeaders,
      },
    });
  } catch (error) {
    if (isAbortError(error) && !callerSignal?.aborted) {
      throw new Error("Tiempo de espera agotado al conectar con el servidor");
    }

    throw error;
  } finally {
    cleanup();
  }

  const text = await res.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = extractApiErrorMessage(data, res.status);
    if (res.status === 401) {
      if (retryOnUnauthorized && path !== "/login" && path !== "/login/refresh") {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return apiFetch<T>(path, options, false);
        }
      }
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    if (res.status === 500 && typeof window !== "undefined" && window.location.pathname !== "/error-500") {
      window.location.replace("/error-500");
    }
    throw Object.assign(new Error(msg), {
      status: res.status,
      payload: data,
    }) as ApiRequestError;
  }

  return data as T;
}

function queueOfflineResponse<T>(path: string, options: ApiFetchOptions): T {
  enqueueOfflineRequest({
    path,
    method: String(options.method ?? "GET").toUpperCase(),
    headers: normalizeHeaders(options.headers),
    body: typeof options.body === "string" ? options.body : undefined,
    queuedMessage: options.offlineQueue?.queuedMessage,
  });

  return {
    success: true,
    queued: true,
    message: options.offlineQueue?.queuedMessage ?? "La acción se sincronizará cuando vuelva la conexión",
    data: options.offlineQueue?.optimisticResponse ?? null,
  } as T;
}

export async function flushOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0, pending: 0 };
  }

  let processed = 0;
  let failed = 0;
  let remaining: typeof queue = [];

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];

    try {
      await executeApiRequest(item.path, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      processed += 1;
    } catch (error) {
      if (isNetworkError(error) || isOffline()) {
        remaining = queue.slice(index);
        break;
      }

      failed += 1;
    }
  }

  replaceOfflineQueue(remaining);
  if (processed > 0 || failed > 0) {
    notifyOfflineQueueFlushed(processed, failed, remaining.length);
  }

  return { processed, failed, pending: remaining.length };
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const { offlineQueue, ...requestOptions } = options;

  if (offlineQueue?.enabled && isOffline()) {
    return queueOfflineResponse<T>(path, options);
  }

  // Sanitización defensiva: algunos endpoints del backend rechazan props extra (whitelist estricto).
  // Si por caché/HMR/cola se cuela `usuarioId` en /bajas, lo eliminamos aquí para evitar 400.
  if (path === "/bajas" && typeof requestOptions.body === "string") {
    try {
      const parsed = JSON.parse(requestOptions.body) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        delete (parsed as any).usuarioId;
        requestOptions.body = JSON.stringify(parsed);
      }
    } catch {
      // si no es JSON válido, no tocamos nada
    }
  }

  try {
    return await executeApiRequest<T>(path, requestOptions, retryOnUnauthorized);
  } catch (error) {
    if (offlineQueue?.enabled && isNetworkError(error)) {
      return queueOfflineResponse<T>(path, options);
    }

    throw error;
  }
}
