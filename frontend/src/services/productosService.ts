import { apiFetch } from "./apiClient";

export type { Categoria, Proveedor, Producto } from "../types";
import type { Categoria, Proveedor, Producto } from "../types";

export type CrearProductoPayload = {
  nombre: string;
  precio: number;
  precioUnitario: string;
  stock: number;
  stockMinimo: number;
  categoriaId: number | string;
  proveedorId: number | string;
  unidadMedida: string;
  marca: string;
  codigoBarras: string;
  fechaCaducidad: string | null;
  alergenos: string[];
  descripcion: string;
  imagen: string;
  activo: boolean;
};

export type RegistrarBajaPayload = {
  productoId: number | string;
  cantidad: number;
  tipoBaja: string;
  motivo: string;
  usuarioId?: string;
};

export type CrearPedidoPayload = {
  proveedorId: number | string | null | undefined;
  total: number;
  usuarioId?: string;
  items: Array<{
    producto_id: number | string;
    unidad?: string;
    cantidad: number;
    precio: number;
    nombre: string;
  }>;
};

function unwrap<T>(json: unknown): T[] {
  return (Array.isArray(json) ? json : ((json as any)?.data ?? [])) as T[];
}

export async function getProductos(): Promise<Producto[]> {
  return unwrap<Producto>(await apiFetch("/productos"));
}

export async function getCategorias(): Promise<Categoria[]> {
  return unwrap<Categoria>(await apiFetch("/categorias"));
}

export async function getProveedores(): Promise<Proveedor[]> {
  return unwrap<Proveedor>(await apiFetch("/proveedores"));
}

export async function crearProducto(payload: CrearProductoPayload): Promise<unknown> {
  return apiFetch("/productos", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
  });
}

export type CrearProductoMinimoPayload = {
  nombre: string;
  precio: number;
  unidadMedida: "ud" | "kg" | "l";
  proveedorId: number | string;
};

export type ProductoMinimoCreado = {
  id: string;
  nombre: string;
  precio: number;
  unidadMedida?: string;
  precioUnitario?: string;
  proveedorId?: number | string | null;
};

export async function crearProductoMinimo(payload: CrearProductoMinimoPayload): Promise<ProductoMinimoCreado> {
  // Creamos un producto mínimo para poder referenciarlo desde el pedido (FK).
  // Lo dejamos con stock 0 y activo=true (para que sea visible y editable en inventario).
  const body = {
    nombre: payload.nombre,
    precio: payload.precio,
    stock: 0,
    stockMinimo: 0,
    proveedorId: payload.proveedorId,
    categoriaId: null,
    unidadMedida: payload.unidadMedida,
    precioUnitario: payload.unidadMedida,
    marca: "Pendiente",
    codigoBarras: "",
    fechaCaducidad: null,
    descripcion: "Producto creado desde pedido manual",
    imagen: "producto-generico.jpg",
    alergenos: [],
    activo: true,
  };
  return apiFetch("/productos", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(body),
  }) as Promise<ProductoMinimoCreado>;
}

export async function actualizarProducto(
  id: number | string,
  payload: Partial<CrearProductoPayload> & { nombre: string; precio: number },
): Promise<unknown> {
  return apiFetch(`/productos/${id}`, {
    method: "PUT",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
  });
}

export async function crearProductosBatch(items: CrearProductoPayload[]): Promise<unknown> {
  return apiFetch("/productos/batch", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(items),
    offlineQueue: {
      enabled: true,
      queuedMessage: "Los productos se han dejado en cola y se crearán al recuperar conexión.",
    },
  });
}

export async function registrarBaja(payload: RegistrarBajaPayload): Promise<unknown> {
  // El backend rechaza campos extra como `usuarioId` en /bajas.
  // Aceptamos el tipo por compatibilidad, pero lo excluimos del body.
  const { usuarioId: _usuarioId, ...body } = payload;
  return apiFetch("/bajas", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(body),
    offlineQueue: {
      enabled: true,
      queuedMessage: "La baja queda pendiente y se sincronizará cuando vuelva la red.",
    },
  });
}

export async function crearPedido(payload: CrearPedidoPayload): Promise<unknown> {
  // El backend rechaza campos extra como `usuarioId` en /pedidos (whitelist estricto).
  // El usuario se obtiene del JWT en el backend.
  const { usuarioId: _usuarioId, ...rest } = payload as any;

  // El backend solo acepta: proveedorId, total?, items[{ producto_id, unidad?, cantidad, precio }]
  // (no acepta `nombre` dentro de items).
  const body = {
    ...rest,
    proveedorId: Number((rest as any).proveedorId),
    items: Array.isArray((rest as any).items)
      ? (rest as any).items.map((it: any) => ({
          producto_id: String(it.producto_id),
          unidad: it.unidad,
          cantidad: it.cantidad,
          precio: it.precio,
        }))
      : undefined,
  };
  return apiFetch("/pedidos", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(body),
    offlineQueue: {
      enabled: true,
      queuedMessage: "El pedido se ha guardado en cola y se enviará al recuperar conexión.",
    },
  });
}