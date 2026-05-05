import { apiFetch } from "./apiClient";

export type LoteProducto = {
  id: number;
  productoId: string;
  pedidoId?: number | null;
  detalleId?: number | null;
  fechaCaducidad: string | null;
  cantidad: number;
};

export type CrearLotePayload = {
  productoId: string | number;
  fechaCaducidad?: string | null;
  cantidad: number;
};

function unwrap<T>(json: unknown): T[] {
  return (Array.isArray(json) ? json : ((json as any)?.data ?? [])) as T[];
}

export async function getLotesProducto(): Promise<LoteProducto[]> {
  return unwrap<LoteProducto>(await apiFetch("/lotes", { headers: { "X-Requested-With": "XMLHttpRequest" } }));
}

export async function crearLotesBatch(items: CrearLotePayload[]): Promise<LoteProducto[]> {
  return unwrap<LoteProducto>(await apiFetch("/lotes/batch", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(items),
  }));
}

export async function consumirLote(payload: { loteId: number; cantidad: number }) {
  return apiFetch("/lotes/consumir", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
  });
}

