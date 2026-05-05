import { apiFetch } from "./apiClient";
import type { Escandallo, EscandalloItem } from "../types";

type ApiDataResponse<T> = {
  success?: boolean;
  data?: T;
};

type SaveEscandalloPayload = {
  nombre: string;
  autor?: string;
  pvp: number;
  elaboracion: string;
  items: EscandalloItem[];
};

export async function getEscandallos(): Promise<Escandallo[]> {
  const response = await apiFetch<ApiDataResponse<Escandallo[]>>("/escandallos");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function saveEscandallo(
  payload: SaveEscandalloPayload,
  id?: number | null,
): Promise<Escandallo> {
  const safeCosteTotal = payload.items.reduce(
    (total, item) => total + Number(item.cantidad) * Number(item.precio),
    0,
  );

  const response = await apiFetch<ApiDataResponse<Escandallo>>(
    id ? `/escandallos/${id}` : "/escandallos",
    {
      method: id ? "PUT" : "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(payload),
      offlineQueue: {
        enabled: true,
        queuedMessage: "El escandallo queda en cola y se sincronizará cuando vuelva la conexión.",
        optimisticResponse: {
          id: id ?? Date.now(),
          nombre: payload.nombre,
          autor: payload.autor ?? "Pendiente",
          coste: safeCosteTotal,
          pvp: payload.pvp,
          elaboracion: payload.elaboracion,
          items: payload.items,
        },
      },
    },
  );

  return response.data as Escandallo;
}

export async function deleteEscandallo(id: number): Promise<void> {
  await apiFetch(`/escandallos/${id}`, {
    method: "DELETE",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    offlineQueue: {
      enabled: true,
      queuedMessage: "La eliminación del escandallo queda en cola hasta recuperar conexión.",
    },
  });
}