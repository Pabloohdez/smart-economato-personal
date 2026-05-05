import { apiFetch } from "./apiClient";
import type { Pedido, PedidoHistorial } from "../types";
import type { CrearPedidoPayload } from "./productosService";

type PedidosResponse<T> = {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

export async function getPedidos(): Promise<PedidoHistorial[]> {
  const json = await apiFetch<PedidosResponse<PedidoHistorial[]>>("/pedidos", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  if (!json?.success) {
    throw new Error(json?.error?.message || "Error cargando pedidos");
  }

  return Array.isArray(json.data) ? json.data : [];
}

export async function getPedidosPendientes(): Promise<Pedido[]> {
  const json = await apiFetch<PedidosResponse<Pedido[]>>("/pedidos", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  if (!json?.success) {
    throw new Error(json?.error?.message || "Error cargando pedidos pendientes");
  }

  const pedidos = Array.isArray(json.data) ? json.data : [];
  return pedidos.filter((pedido) => pedido.estado === "PENDIENTE" || pedido.estado === "INCOMPLETO");
}

export async function crearPedidoHistorial(payload: CrearPedidoPayload): Promise<boolean> {
  // El backend (Nest + ValidationPipe con forbidNonWhitelisted) solo acepta
  // { proveedorId:number, total?:number, items?:[{producto_id:string,unidad?:string,cantidad:number,precio:number}] }
  // y rechaza propiedades extra (usuarioId, nombre, proveedor_id, etc).
  const apiPayload = {
    proveedorId: payload.proveedorId == null ? payload.proveedorId : Number(payload.proveedorId),
    total: payload.total,
    items: Array.isArray(payload.items)
      ? payload.items.map((i) => ({
          producto_id: String(i.producto_id),
          unidad: (i as { unidad?: string }).unidad,
          cantidad: i.cantidad,
          precio: i.precio,
        }))
      : undefined,
  };

  const json = await apiFetch<PedidosResponse<unknown>>("/pedidos", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(apiPayload),
    offlineQueue: {
      enabled: true,
      queuedMessage: "El pedido queda en cola y se enviará cuando vuelva la conexión.",
    },
  });

  return Boolean(json?.success);
}

export async function recibirPedido(
  pedidoId: number | string,
  items: Array<{ detalle_id: number | string; cantidad_recibida: number; lotes?: Array<{ fecha_caducidad?: string | null; cantidad: number }> }>,
): Promise<string> {
  const json = await apiFetch<{ data?: { message?: string } }>(`/pedidos/${pedidoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ accion: "RECIBIR", items }),
    offlineQueue: {
      enabled: true,
      queuedMessage: "La recepción del pedido queda en cola y se sincronizará al volver la conexión.",
      optimisticResponse: {
        message: "Recepción en cola para sincronización",
      },
    },
  });

  return json?.data?.message ?? (json as { message?: string })?.message ?? "Recepción procesada correctamente";
}