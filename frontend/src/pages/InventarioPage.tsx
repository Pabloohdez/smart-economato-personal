import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductos, type Producto } from "../services/productosService";
import { useNavigate } from "react-router-dom";
import { Boxes } from "lucide-react";
import InventarioTable from "../components/inventario/InventarioTable";
import InventarioToolbar from "../components/inventario/InventarioToolbar";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { showNotification } from "../utils/notifications";
import { scanBarcodeFromCamera } from "../utils/barcodeScanner";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import { queryKeys } from "../lib/queryClient";
import { getLotesProducto, type LoteProducto } from "../services/lotesService";

function parseFechaCaducidad(raw: unknown): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date: Date): number {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export default function InventarioPage() {
  const nav = useNavigate();

  // filtros toolbar
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");   // en tu toolbar es string, lo usamos por nombre (simple)
  const [provId, setProvId] = useState(""); // igual
  const [orden, setOrden] = useState<"asc" | "desc">("asc");
  const [onlyStockBajo, setOnlyStockBajo] = useState(false);
  const [onlyProximoCaducar, setOnlyProximoCaducar] = useState(false);

  const LOW_STOCK_THRESHOLD = 5;
  const EXPIRING_DAYS_THRESHOLD = 30;

  const productosQuery = useQuery({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    refetchInterval: 45_000,
  });

  const lotesQuery = useQuery<LoteProducto[]>({
    queryKey: queryKeys.lotesProducto,
    queryFn: getLotesProducto,
    refetchInterval: 45_000,
  });

  const items: Producto[] = productosQuery.data ?? [];
  const activeItems = useMemo(
    () => items.filter((item) => (item as any).activo !== false),
    [items],
  );
  const loading = productosQuery.isLoading;
  const productosError = productosQuery.error instanceof Error ? productosQuery.error.message : "";
  const lotesError = lotesQuery.error instanceof Error ? lotesQuery.error.message : "";

  // “cats” y “provs” para el toolbar (con id fake = nombre)
  const cats = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    activeItems.forEach((p) => {
      const nombre = String(p.categoria?.nombre ?? "").trim();
      if (!nombre) return;
      const key = nombre.toLowerCase();
      if (!map.has(key)) map.set(key, { id: key, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [activeItems]);

  const provs = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    activeItems.forEach((p) => {
      const nombre = String(p.proveedor?.nombre ?? "").trim();
      if (!nombre) return;
      const key = nombre.toLowerCase();
      if (!map.has(key)) map.set(key, { id: key, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [activeItems]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = activeItems.slice();

    if (onlyStockBajo) {
      list = list.filter((p) => Number(p.stock ?? 0) <= Number((p as any).stockMinimo ?? LOW_STOCK_THRESHOLD));
    }

    if (onlyProximoCaducar) {
      list = list.filter((p) => {
        const d = parseFechaCaducidad((p as any).fechaCaducidad);
        if (!d) return false;
        const diff = daysUntil(d);
        return diff <= EXPIRING_DAYS_THRESHOLD;
      });
    }

    if (s) {
      list = list.filter((p) => {
        const nombre = String(p.nombre ?? "").toLowerCase();
        const id = String(p.id ?? "").toLowerCase();
        const codigoBarras = String((p as any).codigoBarras ?? "").toLowerCase();
        const codigoBarrasSnake = String((p as any).codigo_barras ?? "").toLowerCase();
        const marca = String((p as any).marca ?? "").toLowerCase();

        return (
          nombre.includes(s) ||
          id.includes(s) ||
          codigoBarras.includes(s) ||
          codigoBarrasSnake.includes(s) ||
          marca.includes(s)
        );
      });
    }

    if (catId) {
      list = list.filter((p) => String(p.categoria?.nombre ?? "").toLowerCase() === catId);
    }

    if (provId) {
      list = list.filter((p) => String(p.proveedor?.nombre ?? "").toLowerCase() === provId);
    }

    // tu orden actual por precio
    list.sort((a, b) => {
      const pa = Number(a.precio ?? 0);
      const pb = Number(b.precio ?? 0);
      return orden === "asc" ? pa - pb : pb - pa;
    });

    return list;
  }, [activeItems, q, catId, provId, orden, onlyStockBajo, onlyProximoCaducar]);

  function limpiarFiltros() {
    setQ("");
    setCatId("");
    setProvId("");
    setOrden("asc");
    setOnlyStockBajo(false);
    setOnlyProximoCaducar(false);
  }

  async function escanearCodigoBarras() {
    const code = await scanBarcodeFromCamera();
    if (!code) {
      showNotification("No se pudo leer un codigo de barras. Intenta de nuevo.", "warning");
      return;
    }
    setQ(code);
    showNotification(`Codigo leido: ${code}`, "success");
  }

  async function reintentarCarga() {
    await Promise.all([productosQuery.refetch(), lotesQuery.refetch()]);
  }

  function buildExportRows() {
    return filtered.map((item) => ({
      Producto: String(item.nombre ?? ""),
      Categoria: String(item.categoria?.nombre ?? ""),
      Precio: Number(item.precio ?? 0),
      Stock: Number(item.stock ?? 0),
      Caducidad: String((item as any).fechaCaducidad ?? ""),
      Proveedor: String(item.proveedor?.nombre ?? ""),
    }));
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportarProductosCsv() {
    const rows = buildExportRows();

    const csv = [
      Object.keys(rows[0] ?? { Producto: "", Categoria: "", Precio: "", Stock: "", Caducidad: "", Proveedor: "" }).join(";"),
      ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `inventario-${new Date().toISOString().slice(0, 10)}.csv`);
    showNotification("Inventario exportado correctamente.", "success");
  }

  async function exportarProductosXlsx() {
    const rows = buildExportRows();
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification("Inventario exportado correctamente.", "success");
  }

  useEffect(() => {
    void reintentarCarga();

    const onOnline = () => {
      void reintentarCarga();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void reintentarCarga();
      }
    };
    const onPageShow = () => {
      void reintentarCarga();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <StaggerPage>
      <StaggerItem>
        <div className="mb-[30px] border-b-2 border-[var(--color-border-default)] pb-5 flex flex-wrap items-end justify-between gap-4 max-[768px]:items-stretch">
          <div>
            <h1 className="m-0 mb-2 flex items-center gap-3 text-[28px] font-bold text-primary">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                <Boxes className="h-5 w-5" strokeWidth={2} />
              </span>
              Inventario
            </h1>
            <p className="m-0 text-[14px] text-[#50596D]">
              Consulta existencias, lotes y disponibilidad para planificar compras y reposicion.
            </p>
          </div>
          <div />
        </div>
      </StaggerItem>

      <StaggerItem>
        <InventarioToolbar
          q={q}
          setQ={setQ}
          cats={cats as any}
          catId={catId}
          setCatId={setCatId}
          provs={provs as any}
          provId={provId}
          setProvId={setProvId}
          orden={orden}
          setOrden={setOrden}
          onlyStockBajo={onlyStockBajo}
          setOnlyStockBajo={setOnlyStockBajo}
          onlyProximoCaducar={onlyProximoCaducar}
          setOnlyProximoCaducar={setOnlyProximoCaducar}
          onExportCsv={exportarProductosCsv}
          onExportXlsx={exportarProductosXlsx}
          onCreateProduct={() => nav("/inventario/nuevo")}
          limpiarFiltros={limpiarFiltros}
          totalItems={filtered.length}
        />
      </StaggerItem>

      {loading && (
        <StaggerItem>
          <div className="space-y-4">
            <div className="rounded-[30px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06),0_10px_24px_rgba(226,232,240,0.55)]">
              <div className="grid gap-3 xl:grid-cols-[minmax(360px,1.7fr)_220px_200px_auto]">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <Skeleton className="h-10 w-[220px] rounded-xl" />
                <Skeleton className="h-10 w-[220px] rounded-xl" />
                <Skeleton className="h-10 w-[140px] rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-[620px] rounded-[32px]" />
          </div>
        </StaggerItem>
      )}
      {productosError && (
        <StaggerItem>
          <div className="flex flex-col gap-4">
            <Alert type="error" title="Error al cargar inventario">{productosError}</Alert>
            <div>
              <Button type="button" variant="secondary" onClick={reintentarCarga}>
                Reintentar carga
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      {!loading && !productosError && lotesError && (
        <StaggerItem>
          <div className="flex flex-col gap-4">
            <Alert type="warning" title="Lotes no disponibles">
              {lotesError}. El inventario base sigue disponible, pero la informacion de lotes puede estar incompleta.
            </Alert>
            <div>
              <Button type="button" variant="secondary" onClick={() => lotesQuery.refetch()}>
                Reintentar lotes
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      {!loading && !productosError && (
        <StaggerItem>
          <InventarioTable items={filtered} lotes={lotesQuery.data ?? []} />
        </StaggerItem>
      )}
    </StaggerPage>
  );
}