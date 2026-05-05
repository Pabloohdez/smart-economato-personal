import { apiFetch } from "./apiClient";
import type { Proveedor } from "../types";

type ProveedoresResponse = {
  success?: boolean;
  data?: Proveedor[];
};

export type SaveProveedorPayload = {
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
};

export async function getProveedoresLista(): Promise<Proveedor[]> {
  const json = await apiFetch<ProveedoresResponse>("/proveedores", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  return Array.isArray(json?.data) ? json.data : [];
}

export async function saveProveedor(
  payload: SaveProveedorPayload,
  id?: number | string,
): Promise<void> {
  const path = id ? `/proveedores/${id}` : "/proveedores";
  const method = id ? "PUT" : "POST";

  await apiFetch(path, {
    method,
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
    offlineQueue: {
      enabled: true,
      queuedMessage: "El proveedor queda en cola y se sincronizará cuando vuelva la conexión.",
    },
  });
}

export async function deleteProveedor(id: number | string): Promise<void> {
  await apiFetch(`/proveedores/${id}`, {
    method: "DELETE",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    offlineQueue: {
      enabled: true,
      queuedMessage: "La eliminación del proveedor queda en cola hasta recuperar conexión.",
    },
  });
}