import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { getProductos, getProveedores } from "../services/productosService";
import PedidosGrid from "../components/pedidos/PedidosTable";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import EmptyState from "../components/ui/EmptyState";
import { showConfirm, showNotification } from "../utils/notifications";
import type { Proveedor, Producto, PedidoHistorial } from "../types";
import { queryKeys } from "../lib/queryClient";
import { crearPedidoHistorial, getPedidos } from "../services/pedidosService";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import UiSelect from "../components/ui/UiSelect";
import { crearProductoMinimo } from "../services/productosService";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import Button from "../components/ui/Button";
import BackofficeTablePanel from "../components/ui/BackofficeTablePanel";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "../components/ui/table";

type ItemPedido = {
  producto_id: number | string;
  nombre: string;
  precio: number;
  cantidad: number;
  unidad?: string;
  unidadBase?: "ud" | "kg" | "l";
  proveedor_id?: number | string | null;
};

const UNIDADES_OPCIONES = [
  { value: "ud", label: "Unidades" },
  { value: "kg", label: "Kg" },
  { value: "l", label: "Litros" },
  { value: "g", label: "Gramos" },
  { value: "ml", label: "Mililitros" },
] as const;

function normalizarUnidad(raw?: string) {
  const u = String(raw ?? "").trim().toLowerCase();
  if (!u) return "ud";
  if (u === "unidad" || u === "unidades" || u === "ud") return "ud";
  if (u === "kilo" || u === "kilos" || u === "kg") return "kg";
  if (u === "litro" || u === "litros" || u === "l") return "l";
  if (u === "gramo" || u === "gramos" || u === "g") return "g";
  if (u === "mililitro" || u === "mililitros" || u === "ml") return "ml";
  return u;
}

function detectarUnidadDesdeTexto(raw?: string): "ud" | "kg" | "l" | "g" | "ml" | null {
  const s = String(raw ?? "").toLowerCase();
  if (!s.trim()) return null;
  // buscamos tokens comunes sin fiarnos del resto del texto
  if (/\bkg\b/.test(s) || /\bkilo(s)?\b/.test(s)) return "kg";
  if (/\bg\b/.test(s) || /\bgramo(s)?\b/.test(s)) return "g";
  if (/\bml\b/.test(s) || /\bmililitro(s)?\b/.test(s)) return "ml";
  // cuidado: "l" puede colisionar con palabras, por eso buscamos " l" o "litro"
  if (/\blitro(s)?\b/.test(s) || /(^|\s)l(\s|$)/.test(s)) return "l";
  if (/\bud\b/.test(s) || /\bunidade(s)?\b/.test(s) || /\bunidad(es)?\b/.test(s)) return "ud";
  return null;
}

function unidadBaseDeProducto(prod: Producto): "ud" | "kg" | "l" {
  // La unidad base debe venir del campo de unidad (no del texto de precio unitario),
  // porque `precioUnitario` a veces contiene descripciones y rompe la detección.
  const fromUnidad = prod.unidadMedida ? normalizarUnidad(prod.unidadMedida) : null;
  const fromPrecioUnitario = !fromUnidad ? detectarUnidadDesdeTexto((prod as any).precioUnitario) : null;
  const u = fromUnidad ?? fromPrecioUnitario ?? "ud";
  if (u === "kg" || u === "g") return "kg";
  if (u === "l" || u === "ml") return "l";
  return "ud";
}

function opcionesUnidadParaBase(base: "ud" | "kg" | "l") {
  if (base === "kg") return [{ value: "kg", label: "Kg" }, { value: "g", label: "Gramos" }] as const;
  if (base === "l") return [{ value: "l", label: "Litros" }, { value: "ml", label: "Mililitros" }] as const;
  return [{ value: "ud", label: "Unidades" }] as const;
}

function factorAUnidadBase(unidad: string, base: "ud" | "kg" | "l") {
  const u = normalizarUnidad(unidad);
  if (base === "ud") return 1;
  if (base === "kg") return u === "g" ? 0.001 : 1;
  if (base === "l") return u === "ml" ? 0.001 : 1;
  return 1;
}

function baseDesdeUnidadSeleccionada(unidad: string): "ud" | "kg" | "l" {
  const u = normalizarUnidad(unidad);
  if (u === "kg" || u === "g") return "kg";
  if (u === "l" || u === "ml") return "l";
  return "ud";
}

function stepDeUnidad(unidad?: string) {
  const u = normalizarUnidad(unidad);
  if (u === "ud" || u === "g" || u === "ml") return 1;
  return 0.001; // kg / l
}

function minDeUnidad(unidad?: string) {
  const u = normalizarUnidad(unidad);
  if (u === "ud" || u === "g" || u === "ml") return 1;
  return 0.001;
}

function hoyES() {
  const fecha = new Date();
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PedidosPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const [vista, setVista] = useState<"lista" | "nuevo">("lista");
  const [fechaPedido, setFechaPedido] = useState("");

  const [proveedorId, setProveedorId] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [itemsPedido, setItemsPedido] = useState<ItemPedido[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNombre, setManualNombre] = useState("");
  const [manualUnidad, setManualUnidad] = useState<"ud" | "kg" | "l">("ud");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualCantidad, setManualCantidad] = useState("");
  const [importandoExcel, setImportandoExcel] = useState(false);

  const [err, setErr] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFechaPedido(today);
  }, []);

  const pedidosQuery = useQuery<PedidoHistorial[]>({
    queryKey: queryKeys.pedidos,
    queryFn: getPedidos,
    refetchInterval: 45_000,
  });

  const proveedoresQuery = useQuery<Proveedor[]>({
    queryKey: queryKeys.proveedores,
    queryFn: getProveedores,
    enabled: vista === "nuevo",
  });

  const productosQuery = useQuery<Producto[]>({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    enabled: vista === "nuevo",
  });

  const guardarPedidosMutation = useMutation({
    mutationFn: async (
      pedidosPorProveedor: Record<string, { proveedorId: string; items: ItemPedido[]; total: number }>,
    ) => {
      let exitos = 0;
      let errores = 0;

      for (const pid of Object.keys(pedidosPorProveedor)) {
        const pedidoData = pedidosPorProveedor[pid];

        const ok = await crearPedidoHistorial({
          proveedorId: pedidoData.proveedorId,
          items: pedidoData.items,
          usuarioId: "1",
          total: pedidoData.total,
        });

        if (ok) {
          exitos++;
        } else {
          errores++;
        }
      }

      return { exitos, errores };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pedidos });
      broadcastQueryInvalidation(queryKeys.pedidos);
    },
  });

  const crearProductoManualMutation = useMutation({
    mutationFn: async () => {
      const nombre = manualNombre.trim();
      const precio = Number(String(manualPrecio || "").replace(",", "."));
      if (!proveedorId) throw new Error("Selecciona un proveedor antes.");
      if (!nombre) throw new Error("Nombre de producto obligatorio.");
      if (!Number.isFinite(precio) || precio < 0) throw new Error("Precio inválido.");
      return crearProductoMinimo({
        nombre,
        precio,
        unidadMedida: manualUnidad,
        proveedorId,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      const prodLike: Producto = {
        id: created.id,
        nombre: created.nombre,
        precio: Number(created.precio ?? 0),
        stock: 0,
        proveedorId: Number.isFinite(Number(proveedorId)) ? Number(proveedorId) : (proveedorId as any),
        unidadMedida: manualUnidad,
        precioUnitario: manualUnidad,
      } as any;
      agregarItem(prodLike);

      // si el usuario puso cantidad, la aplicamos al último item agregado
      const cant = Number(String(manualCantidad || "").replace(",", "."));
      if (Number.isFinite(cant) && cant > 0) {
        setItemsPedido((prev) => {
          let lastIdx = -1;
          for (let i = prev.length - 1; i >= 0; i -= 1) {
            if (String(prev[i].producto_id) === String(created.id)) {
              lastIdx = i;
              break;
            }
          }
          if (lastIdx < 0) return prev;
          const next = prev.slice();
          next[lastIdx] = { ...next[lastIdx], cantidad: cant };
          return next;
        });
      }

      setManualOpen(false);
      setManualNombre("");
      setManualPrecio("");
      setManualCantidad("");
      setManualUnidad("ud");
      showNotification("Producto manual creado y añadido al pedido.", "success");
    },
    onError: (e) => {
      showNotification(e instanceof Error ? e.message : "Error creando producto manual", "error");
    },
  });

  const pedidos = pedidosQuery.data ?? [];
  const estadosUnicos = useMemo(() => {
    return Array.from(
      new Set(
        pedidos
          .map((pedido) => String(pedido.estado ?? "").toUpperCase())
          .filter(Boolean),
      ),
    ).sort();
  }, [pedidos]);
  const proveedores = proveedoresQuery.data ?? [];
  const productos = productosQuery.data ?? [];
  const loadingPedidos = pedidosQuery.isLoading;
  const loadingNuevo = proveedoresQuery.isLoading || productosQuery.isLoading;
  const guardando = guardarPedidosMutation.isPending;

  useEffect(() => {
    if (pedidosQuery.error instanceof Error) {
      setErr(pedidosQuery.error.message);
      return;
    }

    if (vista === "nuevo" && (proveedoresQuery.error || productosQuery.error)) {
      setErr("Error cargando proveedores o productos");
      return;
    }

    setErr("");
  }, [pedidosQuery.error, productosQuery.error, proveedoresQuery.error, vista]);

  const productosFiltrados = useMemo(() => {
    const term = busquedaProducto.trim().toLowerCase();

    return productos.filter((p) => {
      const pid = p.proveedorId ?? p.proveedor?.id ?? null;
      const coincideProveedor = !proveedorId || String(pid) === proveedorId;
      const coincideBusqueda =
        !term ||
        String(p.nombre ?? "").toLowerCase().includes(term) ||
        String((p as any).codigoBarras ?? "").toLowerCase().includes(term);

      return coincideProveedor && coincideBusqueda;
    });
  }, [productos, proveedorId, busquedaProducto]);

  const totalPedido = useMemo(() => {
    return itemsPedido.reduce((acc, item) => {
      const base = item.unidadBase ?? "ud";
      const factor = factorAUnidadBase(item.unidad ?? base, base);
      return acc + item.cantidad * factor * item.precio;
    }, 0);
  }, [itemsPedido]);

  const pedidosResumen = useMemo(() => {
    const pendientes = pedidos.filter((p) => String(p.estado ?? "").toUpperCase() === "PENDIENTE").length;
    const incompletos = pedidos.filter((p) => String(p.estado ?? "").toUpperCase() === "INCOMPLETO").length;
    const importeTotal = pedidos.reduce((acc, p) => acc + Number(p.total ?? 0), 0);

    return { pendientes, incompletos, importeTotal };
  }, [pedidos]);

  function irANuevoPedido() {
    setVista("nuevo");
  }

  function irAHistorial() {
    setVista("lista");
  }

  function agregarItem(prod: Producto) {
    const provId = prod.proveedorId ?? prod.proveedor?.id ?? null;
    const base = unidadBaseDeProducto(prod);
    const unidad = opcionesUnidadParaBase(base)[0].value;

    setItemsPedido((prev) => {
      const existente = prev.find((i) => String(i.producto_id) === String(prod.id));

      if (existente) {
        return prev.map((item) =>
          String(item.producto_id) === String(prod.id)
            ? {
                ...item,
                cantidad: item.cantidad + (normalizarUnidad(item.unidad) === "ud" ? 1 : 1),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          precio: Number(prod.precio),
          cantidad: 1,
          unidad,
          unidadBase: base,
          proveedor_id: provId,
        },
      ];
    });
  }

  function cambiarCantidad(index: number, value: string) {
    const raw = Number(String(value || "").replace(",", "."));
    const unidad = itemsPedido[index]?.unidad ?? "ud";
    const min = minDeUnidad(unidad);
    const cantidad = Number.isFinite(raw) ? Math.max(min, raw) : min;

    setItemsPedido((prev) =>
      prev.map((item, i) => (i === index ? { ...item, cantidad } : item))
    );
  }

  function cambiarUnidad(index: number, unidad: string) {
    setItemsPedido((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextUnidad = unidad || "ud";
        const min = minDeUnidad(nextUnidad);
        const nextCantidad = Math.max(min, Number(item.cantidad || 0) || min);
        const nextBase = baseDesdeUnidadSeleccionada(nextUnidad);
        return { ...item, unidad: nextUnidad, unidadBase: nextBase, cantidad: nextCantidad };
      })
    );
  }

  function borrarItem(index: number) {
    setItemsPedido((prev) => prev.filter((_, i) => i !== index));
  }

  async function guardarPedido() {
    if (itemsPedido.length === 0) {
      showNotification("El pedido está vacío. Agrega al menos un producto.", "warning");
      return;
    }

    const pedidosPorProveedor: Record<
      string,
      { proveedorId: string; items: ItemPedido[]; total: number }
    > = {};

    itemsPedido.forEach((item) => {
      const pid = String(item.proveedor_id || proveedorId || "");
      if (!pid) return;

      if (!pedidosPorProveedor[pid]) {
        pedidosPorProveedor[pid] = {
          proveedorId: pid,
          items: [],
          total: 0,
        };
      }

      const base = item.unidadBase ?? "ud";
      const factor = factorAUnidadBase(item.unidad ?? base, base);
      const cantidadBase = item.cantidad * factor;

      pedidosPorProveedor[pid].items.push({
        ...item,
        unidad: base,
        cantidad: cantidadBase,
      });
      pedidosPorProveedor[pid].total += cantidadBase * item.precio;
    });

    const proveedoresIds = Object.keys(pedidosPorProveedor);

    if (proveedoresIds.length === 0) {
      showNotification("No se pudo determinar el proveedor de los productos.", "error");
      return;
    }

    const confirmado = await showConfirm({
      title: "Confirmar pedido",
      message: `Se generarán ${proveedoresIds.length} pedido(s) distinto(s) según el proveedor. ¿Continuar?`,
      confirmLabel: "Crear pedidos",
      icon: "fa-solid fa-cart-plus",
    });

    if (!confirmado) return;

    try {
      const { exitos, errores } = await guardarPedidosMutation.mutateAsync(pedidosPorProveedor);

      if (exitos > 0 && errores === 0) {
        showNotification(`Se han creado ${exitos} pedido(s) correctamente.`, "success");
        setItemsPedido([]);
        setProveedorId("");
        setVista("lista");
      } else if (exitos > 0 && errores > 0) {
        showNotification(`Proceso terminado con advertencias. Creados: ${exitos}, Fallidos: ${errores}`, "warning");
        setVista("lista");
      } else {
        showNotification("No se pudo crear ningún pedido.", "error");
      }
    } catch {
      showNotification("No se pudo crear ningún pedido.", "error");
    }
  }

  async function exportarPedidosExcel() {
    try {
      const XLSX = await import("xlsx");
      const rows = pedidos.map((p) => ({
        PedidoId: String(p.id),
        Proveedor: String(p.proveedor_nombre ?? ""),
        Estado: String(p.estado ?? ""),
        Total: Number(p.total ?? 0),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      showNotification("Pedidos exportados a Excel.", "success");
    } catch (error) {
      console.error(error);
      showNotification("No se pudo exportar el Excel de pedidos.", "error");
    }
  }

  async function importarPedidosExcel(file: File) {
    setImportandoExcel(true);
    try {
      const [XLSX, proveedoresImport, productosImport] = await Promise.all([
        import("xlsx"),
        getProveedores(),
        getProductos(),
      ]);

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const proveedoresPorId = new Map(proveedoresImport.map((p) => [String(p.id), p]));
      const proveedoresPorNombre = new Map(
        proveedoresImport.map((p) => [String(p.nombre ?? "").trim().toLowerCase(), p]),
      );
      const productosPorId = new Map(productosImport.map((p) => [String(p.id), p]));
      const productosPorNombre = new Map(
        productosImport.map((p) => [String(p.nombre ?? "").trim().toLowerCase(), p]),
      );

      const pedidosPorProveedor: Record<string, { proveedorId: string; items: ItemPedido[]; total: number }> = {};

      for (const row of rows) {
        const proveedorIdRaw = String(
          row.proveedorId ?? row.ProveedorId ?? row.proveedor_id ?? row.proveedorID ?? "",
        ).trim();
        const proveedorNombreRaw = String(
          row.Proveedor ?? row.proveedor ?? row.proveedor_nombre ?? "",
        ).trim();

        const proveedorObj =
          (proveedorIdRaw ? proveedoresPorId.get(proveedorIdRaw) : undefined)
          ?? (proveedorNombreRaw ? proveedoresPorNombre.get(proveedorNombreRaw.toLowerCase()) : undefined);

        if (!proveedorObj) continue;

        const productoIdRaw = String(
          row.producto_id ?? row.ProductoId ?? row.productoId ?? row.productoID ?? "",
        ).trim();
        const productoNombreRaw = String(
          row.Producto ?? row.producto ?? row.producto_nombre ?? "",
        ).trim();

        const productoObj =
          (productoIdRaw ? productosPorId.get(productoIdRaw) : undefined)
          ?? (productoNombreRaw ? productosPorNombre.get(productoNombreRaw.toLowerCase()) : undefined);

        if (!productoObj) continue;

        const cantidad = Number(String(row.Cantidad ?? row.cantidad ?? "0").replace(",", "."));
        if (!Number.isFinite(cantidad) || cantidad <= 0) continue;

        const precioRaw = Number(String(row.Precio ?? row.precio ?? "").replace(",", "."));
        const precio = Number.isFinite(precioRaw) && precioRaw >= 0 ? precioRaw : Number(productoObj.precio ?? 0);
        const unidad = String(row.Unidad ?? row.unidad ?? normalizarUnidad(productoObj.unidadMedida ?? "ud")).trim() || "ud";
        const proveedorId = String(proveedorObj.id);

        if (!pedidosPorProveedor[proveedorId]) {
          pedidosPorProveedor[proveedorId] = {
            proveedorId,
            items: [],
            total: 0,
          };
        }

        const base = unidadBaseDeProducto(productoObj);
        const factor = factorAUnidadBase(unidad, base);
        const cantidadBase = cantidad * factor;

        pedidosPorProveedor[proveedorId].items.push({
          producto_id: productoObj.id,
          nombre: productoObj.nombre,
          precio,
          cantidad: cantidadBase,
          unidad: base,
          unidadBase: base,
          proveedor_id: proveedorObj.id,
        });

        pedidosPorProveedor[proveedorId].total += cantidadBase * precio;
      }

      const proveedoresAProcesar = Object.keys(pedidosPorProveedor);
      if (proveedoresAProcesar.length === 0) {
        showNotification("No se encontraron filas válidas para importar pedidos.", "warning");
        return;
      }

      const { exitos, errores } = await guardarPedidosMutation.mutateAsync(pedidosPorProveedor);
      if (exitos > 0 && errores === 0) {
        showNotification(`Importación completada: ${exitos} pedido(s).`, "success");
      } else if (exitos > 0) {
        showNotification(`Importación parcial: ${exitos} creados, ${errores} fallidos.`, "warning");
      } else {
        showNotification("No se pudo importar ningún pedido.", "error");
      }
    } catch (error) {
      console.error(error);
      showNotification("No se pudo importar el Excel de pedidos.", "error");
    } finally {
      setImportandoExcel(false);
    }
  }

  const irARecepcion = useCallback(
    (id: number | string) => {
      console.log("Pedido a recepcionar:", id);
      nav("/recepcion");
    },
    [nav]
  );

  return (
    <StaggerPage>
      <StaggerItem>
        <div className="mb-[30px] border-b-2 border-[var(--color-border-default)] pb-5 flex flex-wrap items-end justify-between gap-4 max-[900px]:items-stretch">
          <div>
            <h2 className="m-0 text-[28px] font-bold text-[var(--color-text-strong)] flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand-500)] text-white shadow-sm">
                <ClipboardList className="h-5 w-5" />
              </span>
              Pedidos y Compras
            </h2>
            <p className="mt-2 mb-0 text-[14px] text-[var(--color-text-muted)]">Historial de compras y generación de pedidos por proveedor.</p>
          </div>

          <div className="flex gap-[15px] flex-wrap items-center max-[900px]:w-full">
            <div className="inline-flex items-center gap-2.5 px-4 py-3 border border-[var(--color-border-default)] rounded-[12px] bg-[var(--color-bg-surface)] shadow-[var(--shadow-sm)] text-[var(--color-text-muted)] font-semibold max-[900px]:w-full max-[900px]:justify-center">
              <i className="fa-solid fa-calendar text-[var(--color-brand-500)]"></i>
              <span>{hoyES()}</span>
            </div>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <section className="grid grid-cols-3 gap-3 mb-4 max-[900px]:grid-cols-1" aria-label="Resumen de pedidos">
          <article className="border border-[var(--color-border-default)] rounded-[14px] bg-[linear-gradient(180deg,#fff_0%,#f9fbff_100%)] p-[14px_16px] shadow-[0_4px_20px_rgba(15,23,42,0.10)] flex flex-col gap-2 transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.14)]">
            <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">Pedidos Pendientes</span>
            <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{pedidosResumen.pendientes}</strong>
          </article>
          <article className="border border-[var(--color-border-default)] rounded-[14px] bg-[linear-gradient(180deg,#fff_0%,#f9fbff_100%)] p-[14px_16px] shadow-[0_4px_20px_rgba(15,23,42,0.10)] flex flex-col gap-2 transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.14)]">
            <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">Pedidos Incompletos</span>
            <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{pedidosResumen.incompletos}</strong>
          </article>
          <article className="border border-[rgba(179,49,49,0.28)] rounded-[14px] bg-[linear-gradient(135deg,rgba(179,49,49,0.08)_0%,rgba(179,49,49,0.02)_100%)] p-[14px_16px] shadow-[var(--shadow-sm)] flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">Importe Histórico</span>
            <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{pedidosResumen.importeTotal.toFixed(2)} €</strong>
          </article>
        </section>
      </StaggerItem>

      {err && (
        <StaggerItem>
          <Alert type="error">{err}</Alert>
        </StaggerItem>
      )}

      {vista === "lista" && (
        <StaggerItem>
          <div className="mb-[25px]">
          <h3 className="mb-5 border-b-2 border-[var(--color-border-default)] pb-2.5 text-[18px] text-[var(--color-text-strong)]">Historial de Pedidos</h3>

          {loadingPedidos && <Spinner label="Cargando pedidos..." />}

          {!loadingPedidos && pedidos.length === 0 && (
            <EmptyState
              icon="fa-solid fa-cart-arrow-down"
              title="No hay pedidos"
              description="No hay pedidos registrados todavía."
            />
          )}

          {!loadingPedidos && pedidos.length > 0 && (
            <PedidosGrid
              pedidos={pedidos}
              onIrARecepcion={irARecepcion}
              onNuevoPedido={irANuevoPedido}
              estadoFiltro={estadoFiltro}
              onEstadoFiltroChange={setEstadoFiltro}
              estadosUnicos={estadosUnicos}
              onExportar={() => void exportarPedidosExcel()}
              onImportar={(file) => void importarPedidosExcel(file)}
              importando={importandoExcel}
            />
          )}
          </div>
        </StaggerItem>
      )}

      {vista === "nuevo" && (
        <StaggerItem>
          <BackofficeTablePanel
            className="mb-[25px]"
            header={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="m-0 flex items-center gap-2 text-[18px] text-[var(--color-text-strong)]">
                  <i className="fa-solid fa-cart-shopping"></i> Crear Nuevo Pedido
                </h3>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="outline" className="px-3 py-1 text-[11px] font-semibold">
                    {itemsPedido.length} item(s)
                  </Badge>
                  <Badge variant="secondary" className="px-3 py-1 text-[11px] font-semibold">
                    Total: {totalPedido.toFixed(2)} €
                  </Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-[11px] px-3 py-1.5"
                    onClick={irAHistorial}
                  >
                    <i className="fa-solid fa-list"></i> Ver Historial
                  </Button>
                </div>
              </div>
            }
            bodyClassName="space-y-5"
          >

          {loadingNuevo && <Spinner label="Cargando datos..." />}

          {!loadingNuevo && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="selectProveedor">Proveedor:</label>
                  <UiSelect
                    id="selectProveedor"
                    value={proveedorId}
                    onChange={setProveedorId}
                    placeholder="-- Seleccionar Proveedor --"
                    options={[
                      { value: "", label: "-- Seleccionar Proveedor --" },
                      ...proveedores.map((p) => ({ value: String(p.id), label: p.nombre })),
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="fechaPedido">Fecha:</label>
                  <input
                    type="date"
                    id="fechaPedido"
                    disabled
                    className="w-full p-3 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] text-[var(--color-text-strong)] bg-white box-border focus:border-[var(--color-brand-500)] focus:outline-none"
                    value={fechaPedido}
                    onChange={() => {}}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1.5fr] gap-[30px] mt-5 max-[900px]:grid-cols-1">
                <div>
                  <BackofficeTablePanel
                    header={
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h4 className="m-0 text-[16px] font-semibold text-[var(--color-text-strong)]">
                          Productos Disponibles
                        </h4>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (!proveedorId) {
                              showNotification("Selecciona un proveedor antes.", "warning");
                              return;
                            }
                            setManualOpen(true);
                          }}
                        >
                          <i className="fa-solid fa-plus" /> Producto manual
                        </Button>
                      </div>
                    }
                    bodyClassName="p-0"
                  >
                    <div className="p-4 border-b border-slate-100 bg-white">
                      <input
                        type="text"
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        placeholder="Buscar producto por nombre o código..."
                        className="w-full rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="h-[400px] overflow-y-auto bg-white">
                    {productosFiltrados.length === 0 && (
                      <p className="p-4 text-[var(--color-text-muted)]">
                        No hay productos que coincidan con la búsqueda o el filtro seleccionado.
                      </p>
                    )}

                    {productosFiltrados.map((p) => (
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 text-[14px] transition-colors hover:bg-slate-50" key={String(p.id)}>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-[var(--color-text-strong)]">{p.nombre}</div>
                            <div className="mt-1 text-[12px] text-[var(--color-text-muted)]">{Number(p.precio).toFixed(2)} € / {normalizarUnidad((p as any).unidadMedida || "ud")}</div>
                          </div>
                          <Button type="button" className="h-11 w-11 min-w-11 px-0" onClick={() => agregarItem(p)}>
                            +
                          </Button>
                        </div>
                      ))}
                  </div>
                  </BackofficeTablePanel>
                </div>

                <div>
                  <BackofficeTablePanel
                    header={<h4 className="m-0 text-[16px] font-semibold text-[var(--color-text-strong)]">Items del Pedido</h4>}
                    footer={
                      <div className="p-4">
                        <Button
                          type="button"
                          variant="success"
                          className="w-full"
                          onClick={guardarPedido}
                          disabled={guardando}
                        >
                          {guardando ? "Guardando..." : "Confirmar Pedido"}
                        </Button>
                      </div>
                    }
                  >
                    <Table className="min-w-[720px] overflow-hidden rounded-[24px] border border-slate-100 bg-white">
                      <TableHeader>
                        <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                          <TableHead className="rounded-l-2xl">Producto</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead>Cant.</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="rounded-r-2xl">Acción</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {itemsPedido.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="py-6 text-[var(--color-text-muted)]">
                              No hay productos añadidos al pedido.
                            </TableCell>
                          </TableRow>
                        )}

                        {itemsPedido.map((item, idx) => {
                          const unidad = item.unidad ?? "ud";
                          const base = item.unidadBase ?? "ud";
                          const factor = factorAUnidadBase(unidad, base);
                          const subtotal = item.cantidad * factor * item.precio;

                          return (
                            <TableRow key={`${item.producto_id}-${idx}`} className="bo-table-row">
                              <TableCell className="font-medium text-[var(--color-text-strong)]">{item.nombre}</TableCell>
                              <TableCell className="min-w-[180px]">
                                <UiSelect
                                  value={unidad}
                                  onChange={(v) => cambiarUnidad(idx, v)}
                                  options={opcionesUnidadParaBase(base).map((u) => ({
                                    value: u.value,
                                    label: u.label,
                                  }))}
                                />
                              </TableCell>
                              <TableCell>
                                <input
                                  type="number"
                                  min={minDeUnidad(unidad)}
                                  step={stepDeUnidad(unidad)}
                                  value={item.cantidad}
                                  className="w-[96px] rounded-lg border border-[var(--color-border-strong)] px-3 py-2"
                                  onChange={(e) => cambiarCantidad(idx, e.target.value)}
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{item.precio.toFixed(2)} €</TableCell>
                              <TableCell className="whitespace-nowrap font-semibold text-[var(--color-text-strong)]">{subtotal.toFixed(2)} €</TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  className="bo-table-action-btn text-red-500 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => borrarItem(idx)}
                                  aria-label={`Eliminar ${item.nombre}`}
                                >
                                  x
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>

                      <TableFooter>
                        <TableRow className="hover:bg-[var(--color-bg-soft)]">
                          <TableCell colSpan={4} className="text-right font-semibold">
                            Total Estimado:
                          </TableCell>
                          <TableCell colSpan={2} className="font-extrabold whitespace-nowrap text-[var(--color-text-strong)]">
                            {totalPedido.toFixed(2)} €
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </BackofficeTablePanel>
                </div>
              </div>
            </>
          )}
          </BackofficeTablePanel>
        </StaggerItem>
      )}

      {manualOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && !crearProductoManualMutation.isPending && setManualOpen(false)}
        >
          <div className="w-full max-w-[560px] rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[0_25px_50px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="px-6 py-5 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white flex items-center justify-between gap-3">
              <div className="font-extrabold text-[16px]">Añadir producto manual</div>
              <button
                type="button"
                className="bg-white/20 border-0 text-white w-9 h-9 rounded-full cursor-pointer inline-flex items-center justify-center hover:bg-white/30 disabled:opacity-60"
                onClick={() => setManualOpen(false)}
                disabled={crearProductoManualMutation.isPending}
                aria-label="Cerrar"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6 grid gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Nombre
                </label>
                <input
                  value={manualNombre}
                  onChange={(e) => setManualNombre(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                  placeholder="Ej: Producto nuevo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Unidad base
                  </label>
                  <UiSelect
                    value={manualUnidad}
                    onChange={(v) => setManualUnidad((v as any) || "ud")}
                    options={[
                      { value: "ud", label: "Unidades (ud)" },
                      { value: "kg", label: "Peso (kg)" },
                      { value: "l", label: "Volumen (l)" },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Precio ({manualUnidad === "kg" ? "€/kg" : manualUnidad === "l" ? "€/l" : "€/ud"})
                  </label>
                  <input
                    value={manualPrecio}
                    onChange={(e) => setManualPrecio(e.target.value)}
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Cantidad inicial (opcional)
                  </label>
                  <input
                    value={manualCantidad}
                    onChange={(e) => setManualCantidad(e.target.value)}
                    type="number"
                    step={manualUnidad === "ud" ? "1" : "0.001"}
                    className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                    placeholder={manualUnidad === "ud" ? "1" : "0.001"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Proveedor
                  </label>
                  <div className="px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] font-semibold">
                    {proveedores.find((p) => String(p.id) === String(proveedorId))?.nombre || "—"}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 max-[640px]:flex-col">
                <button
                  type="button"
                  className="min-h-11 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-5 py-2.5 rounded-[10px] font-semibold cursor-pointer hover:bg-[var(--color-border-default)] max-[640px]:w-full disabled:opacity-60"
                  onClick={() => setManualOpen(false)}
                  disabled={crearProductoManualMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="min-h-11 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white border-0 px-6 py-2.5 rounded-[10px] font-semibold cursor-pointer shadow-[0_4px_15px_rgba(179,49,49,0.25)] hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed max-[640px]:w-full"
                  onClick={() => crearProductoManualMutation.mutate()}
                  disabled={crearProductoManualMutation.isPending}
                >
                  {crearProductoManualMutation.isPending ? "Creando..." : "Crear y añadir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </StaggerPage>
  );
}