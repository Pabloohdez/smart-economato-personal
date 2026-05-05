import { apiFetch } from "./apiClient";
import type { AlergenoCatalogo } from "../types";

type ApiListResponse<T> = {
  success?: boolean;
  data?: T;
};

export async function getAlergenosCatalogo(): Promise<AlergenoCatalogo[]> {
  const response = await apiFetch<ApiListResponse<AlergenoCatalogo[]>>("/alergenos");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getMisAlergias(): Promise<string[]> {
  const response = await apiFetch<ApiListResponse<string[]>>("/alergenos/mine");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function saveMisAlergias(alergias: string[]): Promise<string[]> {
  const response = await apiFetch<ApiListResponse<{ alergias: string[] }>>("/alergenos/mine", {
    method: "PUT",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({ alergias }),
    offlineQueue: {
      enabled: true,
      queuedMessage: "Tus alergias quedan pendientes y se sincronizarán al recuperar conexión.",
      optimisticResponse: { alergias },
    },
  });

  return Array.isArray(response?.data?.alergias) ? response.data.alergias : [];
}