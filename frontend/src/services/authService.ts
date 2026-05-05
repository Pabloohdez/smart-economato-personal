import { apiFetch } from "./apiClient";
import { clearSession, saveSession } from "./sessionService";
import type { ApiRequestError } from "./apiClient";

export type UsuarioActivo = Record<string, unknown>;

type LoginResponse = {
  success: boolean;
  data: {
    token: string;
    refreshToken?: string;
    user: UsuarioActivo;
  };
};

type MessageResponse = {
  success?: boolean;
  message?: string;
  data?: {
    message?: string;
    [key: string]: unknown;
  };
};

export async function login(username: string, password: string): Promise<UsuarioActivo> {
  try {
    const response = await apiFetch<LoginResponse>("/login", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify({ username, password }),
    });
    if (response?.success && response?.data?.token && response?.data?.user) {
      saveSession(response.data.token, response.data.user, response.data.refreshToken);
      return response.data.user;
    }
    throw new Error("No se pudo iniciar sesión");
  } catch (error) {
    clearSession();
    const requestError = error as ApiRequestError;
    throw new Error(requestError?.message || "No se pudo iniciar sesión");
  }
}

export async function requestPasswordReset(email: string) {
  return apiFetch<MessageResponse>("/login/forgot-password", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return apiFetch<MessageResponse>("/login/reset-password", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({ token, password }),
  });
}

export async function verifyAccount(token: string) {
  return apiFetch<MessageResponse>(`/usuarios/verify?token=${encodeURIComponent(token)}`, {
    method: "GET",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
}

export async function resendVerification(email: string) {
  return apiFetch<MessageResponse>("/usuarios/resend-verification", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({ email }),
  });
}

export function logout() {
  clearSession();
}
