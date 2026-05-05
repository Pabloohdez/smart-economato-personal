// frontend/src/pages/Distribucion.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Boxes, CalendarDays, Check, History, Minus, PackageSearch, Plus, Plug, PlugZap, Scale, ShoppingCart, Trash2, Truck } from "lucide-react";

import { showConfirm, showNotification } from "../utils/notifications";
import {
  filtrarListaPorAlergenos,
  generarBadgesProducto,
  mostrarAlertaAlergenos,
  productoTieneAlergenos,
  verificarPreferencias,
} from "../utils/alergenosUtils";
import { apiFetch } from "../services/apiClient";
import type { Producto, Movimiento } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useScaleSerial } from "../hooks/useScaleSerial";
import UiSelect from "../components/ui/UiSelect";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import BackofficeTablePanel from "../components/ui/BackofficeTablePanel";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

type CarritoItem = {
  productoId: number | string;
  nombre: string;
  cantidad: number;
  unidad?: string;
};

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
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

function badgeDestinoClass(motivoRaw?: string) {
  const motivo = (motivoRaw || "Sin especificar").toLowerCase();
  if (motivo.includes("cocina")) return "bg-[linear-gradient(135deg,#fed7d7_0%,#feb2b2_100%)] text-[#c53030]";
  if (motivo.includes("bar") || motivo.includes("cafetería") || motivo.includes("cafeteria")) return "bg-[linear-gradient(135deg,#feebc8_0%,#fbd38d_100%)] text-[#c05621]";
  if (motivo.includes("eventos")) return "bg-[linear-gradient(135deg,#e9d8fd_0%,#d6bcfa_100%)] text-[#6b46c1]";
  if (motivo.includes("caducidad") || motivo.includes("merma")) return "bg-[linear-gradient(135deg,#fed7e2_0%,#fbb6ce_100%)] text-[#97266d]";
  if (motivo.includes("donación") || motivo.includes("donacion")) return "bg-[linear-gradient(135deg,#c6f6d5_0%,#9ae6b4_100%)] text-[#22543d]";
  return "bg-[linear-gradient(135deg,var(--color-border-default)_0%,var(--color-border-strong)_100%)] text-[var(--color-text-strong)]";
}

function normalizarUnidad(raw?: string) {
  const u = String(raw ?? "").trim().toLowerCase();
  if (!u) return "ud";
  if (u === "unidad" || u === "unidades" || u === "ud") return "ud";
  if (u === "kilo" || u === "kilos" || u === "kg") return "kg";
  if (u === "litro" || u === "litros" || u === "l") return "l";
  return u;
}

function stepDeUnidad(unidad?: string) {
  const u = normalizarUnidad(unidad);
  if (u === "ud") return 1;
  if (u === "kg" || u === "l") return 0.001;
  return 1;
}

export default function DistribucionPage() {
  const pref = verificarPreferencias();

  // Obtener usuario activo para auditoría de movimientos
  const { user } = useAuth();
  const scale = useScaleSerial({ baudRate: 9600 });

  const [loadingProductos, setLoadingProductos] = useState(true);
  const [productosBase, setProductosBase] = useState<Producto[]>([]);
  const [errorProductos, setErrorProductos] = useState("");

  const [historial, setHistorial] = useState<Movimiento[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState("");

  const [term, setTerm] = useState("");
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const debouncedTerm = useDebouncedValue(term, 250);

  const [productoActual, setProductoActual] = useState<Producto | null>(null);
  const [cantidadSalida, setCantidadSalida] = useState<number>(1);
  const [modoBascula, setModoBascula] = useState<boolean>(true);

  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [motivo, setMotivo] = useState("Cocina");

  // resultados desde API (cuando pulsas Buscar)
  const [productosBusqueda, setProductosBusqueda] = useState<Producto[] | null>(null);

  const buscadorWrapRef = useRef<HTMLDivElement | null>(null);

  async function cargarProductos() {
    setLoadingProductos(true);
    setErrorProductos("");
    try {
      const json = await apiFetch<{ success?: boolean; error?: string; data?: any[] }>("/productos", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (!json?.success) throw new Error(json?.error || "Error cargando productos");

      let list: Producto[] = (json.data ?? []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        precio: Number(p.precio ?? 0),
        stock: Number(p.stock ?? 0),
        codigoBarras: p.codigoBarras,
        unidadMedida: p.unidadMedida,
        alergenos: p.alergenos || [],
      }));

      // filtrado por alergias si la preferencia está activa
      list = filtrarListaPorAlergenos(list);

      setProductosBase(list);
    } catch (e) {
      console.error(e);
      setErrorProductos("No se pudieron cargar los productos de distribución.");
      showNotification("Error de conexión con el servidor (productos).", "error");
      setProductosBase([]);
    } finally {
      setLoadingProductos(false);
    }
  }

  async function cargarHistorial() {
    setLoadingHistorial(true);
    setErrorHistorial("");
    try {
      const json = await apiFetch<{ success?: boolean; data?: any[] }>("/movimientos", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (!json?.success || !Array.isArray(json.data)) {
        setHistorial([]);
        return;
      }

      const salidas: Movimiento[] = json.data.filter((m: any) => m.tipo === "SALIDA");
      setHistorial(salidas);
    } catch (e) {
      console.error(e);
      setErrorHistorial("No se pudo cargar el historial de movimientos.");
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }

  const recargarDistribucion = useCallback(async () => {
    await Promise.all([cargarProductos(), cargarHistorial()]);
  }, []);

  useEffect(() => {
    void recargarDistribucion();
  }, [recargarDistribucion]);

  useEffect(() => {
    const onOnline = () => {
      void recargarDistribucion();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void recargarDistribucion();
      }
    };
    const onPageShow = () => {
      void recargarDistribucion();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [recargarDistribucion]);

  // Si el producto es por kg/l y hay báscula conectada, rellena la cantidad con la lectura
  useEffect(() => {
    if (!productoActual) return;
    const unidad = normalizarUnidad(productoActual.unidadMedida);
    const step = stepDeUnidad(unidad);
    if (step === 1) return;
    if (!modoBascula) return;
    if (!scale.connected || scale.weightKg == null) return;
    const v = Number(scale.weightKg.toFixed(3));
    setCantidadSalida(v);
  }, [productoActual, scale.connected, scale.weightKg, modoBascula]);

  // cerrar dropdown si clic fuera
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (buscadorWrapRef.current && !buscadorWrapRef.current.contains(target)) {
        setResultadosOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const resultadosAutocomplete = useMemo(() => {
    const t = debouncedTerm.trim().toLowerCase();
    if (!t || t.length < 2) return [];

    let list = productosBase.filter((p) => {
      const nom = (p.nombre || "").toLowerCase();
      const cb = (p.codigoBarras || "").toLowerCase();
      return nom.includes(t) || cb.includes(t);
    });

    // ya están filtrados por filtrarListaPorAlergenos, pero por si acaso:
    list = filtrarListaPorAlergenos(list);

    return list.slice(0, 30);
  }, [productosBase, debouncedTerm]);

  const resultadosRender = useMemo(() => {
    if (!resultadosOpen) return [];
    if (productosBusqueda) return productosBusqueda;
    return resultadosAutocomplete;
  }, [resultadosOpen, productosBusqueda, resultadosAutocomplete]);

  async function buscarEnAPI() {
    const t = term.trim().toLowerCase();

    if (t.length < 2) {
      setResultadosOpen(false);
      if (t.length > 0) showNotification("Escribe al menos 2 caracteres para buscar", "warning");
      return;
    }

    // Filter locally from already loaded products
    let matchList = productosBase.filter((p) => {
      const nom = (p.nombre || "").toLowerCase();
      const cb = (p.codigoBarras || "").toLowerCase();
      return nom.includes(t) || cb.includes(t);
    });
    matchList = filtrarListaPorAlergenos(matchList);

    // If exactly one match, auto-select it
    if (matchList.length === 1) {
      seleccionarProducto(matchList[0]);
      return;
    }

    // If there's an exact name match, select it directly
    const exactMatch = matchList.find(
      (p) => (p.nombre || "").toLowerCase() === t
    );
    if (exactMatch) {
      seleccionarProducto(exactMatch);
      return;
    }

    // Otherwise show the results dropdown
    if (matchList.length > 0) {
      setProductosBusqueda(matchList.slice(0, 30));
      setResultadosOpen(true);
    } else {
      setProductosBusqueda([]);
      setResultadosOpen(true);
    }
  }

  function seleccionarProducto(p: Producto) {
    // alerta simple igual que el clásico
    const verif = productoTieneAlergenos(p);
    if (verif.tiene && pref.alertas) {
      showNotification(`⚠️ ATENCIÓN: "${p.nombre}" contiene: ${verif.alergenos.join(", ")}`, "warning");
    }

    setProductoActual(p);
    const step = stepDeUnidad(p.unidadMedida);
    setCantidadSalida(step);
    setModoBascula(step !== 1);
    setResultadosOpen(false);
    setProductosBusqueda(null);
    setTerm(p.nombre);
  }

  function ajustarCant(delta: number) {
    setCantidadSalida((prev) => {
      const step = stepDeUnidad(productoActual?.unidadMedida);
      let val = Number(prev || step) + delta * step;
      if (val < step) val = step;
      if (productoActual && val > productoActual.stock) val = productoActual.stock;
      // para unidades enteras, evitamos decimales por seguridad
      if (step === 1) val = Math.round(val);
      return val;
    });
  }

  async function agregarAlCarrito() {
    if (!productoActual) return;

    // bloqueo estricto (igual que clásico)
    const verif = productoTieneAlergenos(productoActual);
    if (verif.tiene && pref.bloqueo) {
      showNotification(
        `❌ ACCIÓN BLOQUEADA: No puedes distribuir este producto por alergia a: ${verif.alergenos.join(", ")}`,
        "error"
      );
      return;
    }

    // confirmación (igual que clásico)
    if (verif.tiene && pref.alertas) {
      const ok = await showConfirm(
        `⚠️ ADVERTENCIA DE SEGURIDAD\n\n` +
          `Vas a distribuir "${productoActual.nombre}", que contiene: ${verif.alergenos.join(", ")}.\n\n` +
          `¿Deseas continuar?`
      );
      if (!ok) return;
    }

    // confirm “modal” genérico de alergenosUtils (igual que clásico)
    const debeBloquear = await mostrarAlertaAlergenos(productoActual);
    if (debeBloquear) return;

    const step = stepDeUnidad(productoActual.unidadMedida);
    const cant = Math.max(step, Number(cantidadSalida || step));
    if (cant > productoActual.stock) {
      showNotification("No hay stock suficiente", "error");
      return;
    }

    const unidad = normalizarUnidad(productoActual.unidadMedida);
    setCarrito((prev) => {
      const idx = prev.findIndex((i) => String(i.productoId) === String(productoActual.id));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + cant };
        return copy;
      }
      return [...prev, { productoId: productoActual.id, nombre: productoActual.nombre, cantidad: cant, unidad }];
    });

    setProductoActual(null);
    setTerm("");
    setCantidadSalida(1);
  }

  function eliminarDelCarrito(index: number) {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmarSalida() {
    if (!carrito.length) return showNotification("El carrito está vacío", "warning");

    const ok = await showConfirm(`¿Confirmar salida de ${carrito.length} productos para ${motivo}?`);
    if (!ok) return;

    let errores: string[] = [];
    let exitosos = 0;

    for (const item of carrito) {
      const payload = {
        productoId: item.productoId,
        cantidad: item.cantidad,
        tipo: "SALIDA",
        motivo: motivo,
      };

      try {
        const data = await apiFetch<{ success?: boolean; error?: string }>("/movimientos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest", // SOLO UNA VEZ (tu error era tenerla duplicada)
          },
          body: JSON.stringify(payload),
        });

        if (data?.success) {
          exitosos++;
        } else {
          errores.push(`${item.nombre}: ${data?.error || "Error desconocido"}`);
        }
      } catch (e) {
        console.error(e);
        errores.push(`${item.nombre}: Error de red`);
      }
    }

    if (errores.length === 0) {
      showNotification(`✅ Salidas registradas correctamente (${exitosos} productos).`, "success");
    } else if (exitosos > 0) {
      showNotification(`⚠️ Parcial: ${exitosos} OK, ${errores.length} errores.`, "warning");
    } else {
      showNotification("❌ Error al registrar salidas.", "error");
    }

    setCarrito([]);
    await cargarProductos();
    await cargarHistorial();
  }

  return (
    <StaggerPage>
      <StaggerItem>
        <div className="mb-[30px] border-b-2 border-[var(--color-border-default)] pb-5 flex flex-wrap items-end justify-between gap-4 max-[768px]:items-stretch">
          <div>
            <h2 className="m-0 text-[28px] font-bold text-primary flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                <Truck className="h-5 w-5" />
              </span>
              Distribución / Salida de Stock
            </h2>
            <p className="mt-2 mb-0 text-[14px] text-[#50596D]">
              Registra la salida de productos hacia cocina, bar u otros departamentos.
            </p>
          </div>

          <div className="inline-flex items-center gap-2.5 px-[18px] py-3 rounded-[12px] text-[#50596D] font-bold border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-sm)] whitespace-nowrap max-[768px]:w-full max-[768px]:justify-center">
            <CalendarDays className="h-4 w-4 text-[var(--color-brand-500)]" />
            <span>{hoyES()}</span>
          </div>
        </div>
      </StaggerItem>

      {(errorProductos || errorHistorial) && (
        <StaggerItem>
          <div className="mb-5 flex flex-col gap-4">
            {errorProductos ? <Alert type="error" title="Error en productos">{errorProductos}</Alert> : null}
            {errorHistorial ? <Alert type="warning" title="Historial no disponible">{errorHistorial}</Alert> : null}
            <div>
              <Button type="button" variant="secondary" onClick={recargarDistribucion}>
                Reintentar carga
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      <StaggerItem>
        <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] border border-[var(--color-border-default)] rounded-[20px] p-6 shadow-[var(--shadow-sm)] mb-4">
          <div className="flex gap-3 items-center flex-wrap justify-between">
            <div className="flex gap-2.5 items-center flex-wrap">
              <strong>Báscula</strong>
              <span className="text-[13px] text-[#4a5568]">
                Lectura: <strong>{scale.weightKg == null ? "—" : `${scale.weightKg.toFixed(3)} kg`}</strong>
              </span>
              {!scale.supported ? (
                <span className="text-[12px] text-[#e53e3e]">(Web Serial no soportado)</span>
              ) : scale.connected ? (
                <button
                  type="button"
                  className="min-h-11 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-4 py-2.5 rounded-[10px] font-semibold cursor-pointer transition-[background,border-color] duration-200 whitespace-nowrap hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] inline-flex items-center gap-2"
                  onClick={scale.disconnect}
                >
                  <PlugZap className="h-4 w-4" /> Desconectar
                </button>
              ) : (
                <button
                  type="button"
                  className="min-h-11 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-4 py-2.5 rounded-[10px] font-semibold cursor-pointer transition-[background,border-color] duration-200 whitespace-nowrap hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] inline-flex items-center gap-2"
                  onClick={scale.connect}
                >
                  <Plug className="h-4 w-4" /> Conectar
                </button>
              )}
            </div>
            <div className="text-[12px] text-[#718096]">
              Tip: en “Cantidad a retirar” puedes usar decimales (kg).
            </div>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-2 gap-[25px] mt-6 max-[768px]:grid-cols-1">
        {/* Panel Izq */}
        <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] border border-[var(--color-border-default)] rounded-[22px] p-[25px] shadow-[var(--shadow-sm)] min-h-[500px] flex flex-col" ref={buscadorWrapRef}>
          <h3 className="text-[18px] font-semibold text-[var(--color-text-strong)] m-0 mb-5 pb-[15px] border-b-2 border-[var(--color-border-default)] flex items-center gap-2.5">
            <PackageSearch className="h-5 w-5 text-[var(--color-brand-500)]" /> Buscar Producto
          </h3>

          {/* Buscador con ghost text */}
          <div className="flex gap-2.5 items-stretch mb-1">
            <div className="relative flex-1 flex items-center">
              {/* Ghost suggestion behind input */}
              {resultadosAutocomplete.length > 0 &&
                term.length >= 2 &&
                resultadosAutocomplete[0].nombre.toLowerCase().startsWith(term.toLowerCase()) && (
                  <div className="absolute left-0 top-0 w-full h-12 px-4 border-2 border-transparent text-[15px] pointer-events-none z-[2] flex items-center whitespace-pre overflow-hidden" aria-hidden="true">
                    <span style={{ visibility: "hidden" }}>{term}</span>
                    <span style={{ color: "#a0aec0" }}>
                      {resultadosAutocomplete[0].nombre.slice(term.length)}
                    </span>
                  </div>
                )}
              <input
                type="text"
                id="buscadorProd"
                className="relative z-[1] flex-1 w-full h-12 px-4 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] bg-transparent transition-[border-color,box-shadow,background] duration-200 box-border focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.25)] focus:outline-none"
                placeholder="Escribe nombre o código de barras..."
                autoComplete="off"
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  setResultadosOpen(true);
                  setProductosBusqueda(null);
                }}
                onKeyDown={(e) => {
                  // Tab or ArrowRight → accept ghost suggestion
                  if ((e.key === "Tab" || e.key === "ArrowRight") && resultadosAutocomplete.length > 0 && term.length >= 2) {
                    e.preventDefault();
                    setTerm(resultadosAutocomplete[0].nombre);
                    setResultadosOpen(false);
                    return;
                  }
                  // Enter → select first match directly
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (resultadosAutocomplete.length > 0) {
                      seleccionarProducto(resultadosAutocomplete[0]);
                    } else {
                      buscarEnAPI();
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Dropdown de resultados */}
          {resultadosOpen && (
            <div id="listaResultados" className="border-2 border-[var(--color-border-default)] border-t-0 max-h-[220px] overflow-y-auto bg-white rounded-b-[10px] shadow-[0_8px_20px_rgba(0,0,0,0.08)] mt-[-2px]">
              {loadingProductos ? (
                <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-[var(--color-border-default)] text-[var(--color-text-muted)] italic">
                  <Spinner size="sm" label="Cargando productos..." />
                </div>
              ) : resultadosRender.length === 0 ? (
                term.trim().length >= 2 ? (
                  <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-[var(--color-border-default)] text-[var(--color-text-muted)] italic">
                    Sin resultados para «{term.trim()}»
                  </div>
                ) : null
              ) : (
                resultadosRender.map((p) => (
                  <div
                    key={String(p.id)}
                    className="flex items-center justify-between gap-3 px-4 py-[11px] border-b border-[var(--color-border-default)] cursor-pointer transition-[background,padding-left,border-left] duration-150 hover:bg-[#fff5f5] hover:border-l-[3px] hover:border-l-[var(--color-brand-500)] hover:pl-[13px]"
                    role="button"
                    tabIndex={0}
                    onClick={() => seleccionarProducto(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") seleccionarProducto(p);
                    }}
                  >
                    <span className="font-semibold text-[var(--color-text-strong)] text-[14px]">{p.nombre}</span>
                    <span className="text-[12px] text-[var(--color-text-muted)] whitespace-nowrap bg-[var(--color-bg-soft)] px-2 py-0.5 rounded-full font-medium">
                      Stock: {p.stock}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tarjeta del producto seleccionado ── */}
          {productoActual && (
            <div className="mt-5 border-2 border-[var(--color-border-default)] rounded-[14px] overflow-hidden bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
              <div className="flex items-center gap-4 px-5 py-[18px] bg-[linear-gradient(135deg,#fff5f5_0%,#fff_100%)] border-b border-[var(--color-border-default)]">
                <Boxes className="h-7 w-7 text-[var(--color-brand-500)] flex-shrink-0" />
                <div>
                  <p className="text-[18px] font-bold text-[var(--color-text-strong)] m-0 mb-1">{productoActual.nombre}</p>
                  {productoActual && (
                    <div
                      dangerouslySetInnerHTML={{ __html: generarBadgesProducto(productoActual) }}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5 px-5 py-4 text-[14px] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)] bg-[var(--color-bg-soft)]">
                <Boxes className="h-4 w-4" />
                Stock disponible: <strong>{productoActual.stock}</strong> {normalizarUnidad(productoActual.unidadMedida)}
              </div>

              <div className="px-5 py-6 border-b border-[var(--color-border-default)] flex flex-col items-center bg-white">
                <label className="block text-[13px] font-bold text-[var(--color-text-muted)] mb-4">Cantidad a retirar</label>
                <div className="flex items-center border border-[var(--color-border-default)] rounded-lg bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <button
                    type="button"
                    className="w-11 h-11 bg-transparent border-0 cursor-pointer text-[16px] text-[#2b4c7e] inline-flex items-center justify-center transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-brand-500)]"
                    onClick={() => ajustarCant(-1)}
                    aria-label="Disminuir"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    id="cantidadSalida"
                    className="w-[65px] h-11 text-center border-0 border-l border-r border-[var(--color-border-default)] text-[18px] font-extrabold text-[#1a365d] outline-none bg-transparent [appearance:textfield]"
                    value={cantidadSalida}
                    min={stepDeUnidad(productoActual.unidadMedida)}
                    step={stepDeUnidad(productoActual.unidadMedida)}
                    max={productoActual.stock}
                    onChange={(e) => {
                      const step = stepDeUnidad(productoActual.unidadMedida);
                      let v = Number(e.target.value);
                      if (!Number.isFinite(v)) v = step;
                      if (v < step) v = step;
                      if (v > productoActual.stock) v = productoActual.stock;
                      if (step === 1) v = Math.round(v);
                      setCantidadSalida(v);
                    }}
                  />
                  <button
                    type="button"
                    className="w-11 h-11 bg-transparent border-0 cursor-pointer text-[16px] text-[#2b4c7e] inline-flex items-center justify-center transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-brand-500)] disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => {
                      const kg = scale.captureKg();
                      const step = stepDeUnidad(productoActual.unidadMedida);
                      if (kg != null && step !== 1) setCantidadSalida(Number(kg.toFixed(3)));
                    }}
                    aria-label="Usar lectura de báscula"
                    title="Usar lectura de báscula"
                    disabled={!scale.connected || scale.weightKg == null}
                  >
                    <Scale className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="w-11 h-11 bg-transparent border-0 cursor-pointer text-[16px] text-[#2b4c7e] inline-flex items-center justify-center transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-brand-500)]"
                    onClick={() => ajustarCant(1)}
                    aria-label="Aumentar"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {stepDeUnidad(productoActual.unidadMedida) !== 1 && (
                  <div className="mt-2 flex gap-2.5 items-center flex-wrap text-[12px] text-[#718096]">
                    <span>
                      Lectura:{" "}
                      <strong>{scale.weightKg == null ? "—" : `${scale.weightKg.toFixed(3)} kg`}</strong>
                    </span>
                    <label className="inline-flex gap-2 items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modoBascula}
                        onChange={(e) => setModoBascula(e.target.checked)}
                      />
                      Usar báscula (auto)
                    </label>
                  </div>
                )}
              </div>

              <button
                className="w-full py-4 bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] text-white border-0 cursor-pointer text-[15px] font-bold inline-flex items-center justify-center gap-2.5 transition-[letter-spacing,filter] duration-200 hover:brightness-105 hover:tracking-wide"
                type="button"
                onClick={agregarAlCarrito}
              >
                <ShoppingCart className="h-4 w-4" /> Añadir a la Lista de Salida
              </button>
            </div>
          )}
        </div>

        {/* Panel Der */}
        <BackofficeTablePanel
          className="min-h-[500px]"
          header={
            <div className="flex items-center justify-between gap-3">
              <h3 className="m-0 text-[18px] font-semibold text-[var(--color-text-strong)]">Lista de Salida</h3>
              <Badge variant="outline" className="px-3 py-1 text-[11px] font-semibold">
                {carrito.length} items
              </Badge>
            </div>
          }
          footer={
            <div className="p-4">
            <div className="mb-4">
              <label htmlFor="motivoSalida" className="block mb-2 font-semibold text-[#50596D] text-[14px]">
                Destino / Motivo:
              </label>
              <UiSelect
                id="motivoSalida"
                value={motivo}
                onChange={setMotivo}
                options={[
                  { value: "Cocina", label: "Cocina" },
                  { value: "Bar/Cafetería", label: "Bar/Cafetería" },
                  { value: "Eventos", label: "Eventos" },
                  { value: "Caducidad/Merma", label: "Caducidad / Merma" },
                  { value: "Donación", label: "Donación" },
                ]}
              />
            </div>

            <Button className="w-full mt-3.5" variant="success" type="button" onClick={confirmarSalida}>
              <Check className="h-4 w-4" /> Confirmar Salida
            </Button>
            </div>
          }
        >
          <div className="flex-1">
            <Table className="mt-1 overflow-hidden rounded-[24px] border border-slate-100 bg-white">
              <TableHeader>
                <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="rounded-l-2xl">Producto</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead className="rounded-r-2xl">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carrito.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-[var(--color-text-muted)]">
                      La lista está vacía
                    </TableCell>
                  </TableRow>
                ) : (
                  carrito.map((item, index) => (
                    <TableRow key={`${String(item.productoId)}-${index}`} className="bo-table-row">
                      <TableCell className="font-medium text-[var(--color-text-strong)]">{item.nombre}</TableCell>
                      <TableCell className="text-[var(--color-text-strong)]">{item.cantidad} {item.unidad ?? ""}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="bo-table-action-btn text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => eliminarDelCarrito(index)}
                          aria-label={`Eliminar ${item.nombre}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </BackofficeTablePanel>
      </div>

      {/* Historial */}
      <BackofficeTablePanel
        className="mt-5"
        header={
          <div className="flex items-center justify-between gap-3">
            <h3 className="m-0 flex items-center gap-2.5 text-[18px] font-semibold text-[var(--color-text-strong)]">
              <History className="h-5 w-5 text-[var(--color-brand-500)]" /> Historial de Movimientos
            </h3>
            <Badge variant="outline" className="px-3 py-1 text-[11px] font-semibold">
              {historial.length} registro(s)
            </Badge>
          </div>
        }
      >
        {/* Móvil: cards (evita solapes de columnas) */}
        <div className="hidden max-[640px]:block">
          {loadingHistorial ? (
            <div className="py-6 text-center">
              <Spinner size="sm" label="Cargando historial..." />
            </div>
          ) : historial.length === 0 ? (
            <div className="py-6 text-center text-[#666]">No hay salidas registradas</div>
          ) : (
            <div className="grid gap-3">
              {historial.map((mov, idx) => {
                const { fecha, hora } = formatFechaHora(mov.fecha);
                const motivoTxt = mov.motivo || "Sin especificar";
                const cls = badgeDestinoClass(motivoTxt);
                return (
                  <div
                    key={`mov-m-${idx}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] text-slate-500">
                          {fecha} · <span className="text-slate-400">{hora}</span>
                        </div>
                        <div className="mt-1 truncate text-[14px] font-extrabold text-slate-900">
                          {mov.producto_nombre || "Producto desconocido"}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-block rounded-[20px] px-3 py-1.5 text-[12px] font-normal uppercase tracking-[0.5px] ${cls}`}>
                            {motivoTxt}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-border-default)] px-2.5 py-1 text-[12px] font-normal text-[var(--color-text-muted)]">
                            {mov.usuario_nombre || "Desconocido"}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Cantidad</div>
                        <div className="text-[16px] font-extrabold text-slate-900">{mov.cantidad}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tablet/Desktop: tabla */}
        <div className="max-h-[400px] overflow-y-auto max-[640px]:hidden">
          <Table className="min-w-[760px] overflow-hidden rounded-[24px] border border-slate-100 bg-white">
            <TableHeader className="sticky top-0 z-[1] bg-white">
              <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="rounded-l-2xl">Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="rounded-r-2xl">Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingHistorial ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-4 text-center">
                    <Spinner size="sm" label="Cargando historial..." />
                  </TableCell>
                </TableRow>
              ) : historial.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-[#666]">
                    No hay salidas registradas
                  </TableCell>
                </TableRow>
              ) : (
                historial.map((mov, idx) => {
                  const { fecha, hora } = formatFechaHora(mov.fecha);
                  const motivoTxt = mov.motivo || "Sin especificar";
                  const cls = badgeDestinoClass(motivoTxt);

                  return (
                    <TableRow key={idx} className="bo-table-row">
                      <TableCell className="text-center text-[var(--color-text-muted)]">{fecha}</TableCell>
                      <TableCell className="text-center text-[var(--color-text-muted)]">{hora}</TableCell>
                      <TableCell className="text-center text-[var(--color-text-muted)]">{mov.producto_nombre || "Producto desconocido"}</TableCell>
                      <TableCell className="text-center text-[var(--color-text-muted)]">{mov.cantidad}</TableCell>
                      <TableCell className="text-center text-[var(--color-text-muted)]">
                        <span className={`inline-block rounded-[20px] px-3 py-1.5 text-[12px] font-normal uppercase tracking-[0.5px] ${cls}`}>
                          {motivoTxt}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-border-default)] px-2.5 py-1 text-[12px] font-normal text-[var(--color-text-muted)]">
                          {mov.usuario_nombre || "Desconocido"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </BackofficeTablePanel>
      </StaggerItem>
    </StaggerPage>
  );
}