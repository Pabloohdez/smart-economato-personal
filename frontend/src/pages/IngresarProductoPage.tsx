import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Alert from "../components/ui/Alert";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { showConfirm } from "../utils/notifications";
import UiSelect from "../components/ui/UiSelect";

// Ajusta esta línea si en tu proyecto real estos métodos están en otro service
import { getCategorias, getProveedores, crearProductosBatch, getProductos } from "../services/productosService";
import { crearLotesBatch } from "../services/lotesService";
import type { Categoria, Proveedor } from "../types";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";

type LoteTemporal = { fechaCaducidad: string; cantidad: number };

type ProductoTemporal = {
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
  lotes: LoteTemporal[];
  alergenos: string[];
  descripcion: string;
  imagen: string;
  activo: boolean;
  _tempCategoriaNombre: string;
  _tempProveedorNombre: string;
};

export default function IngresarProductoPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [precio, setPrecio] = useState("");
  const [unidadMedida, setUnidadMedida] = useState<"ud" | "kg" | "l">("ud");
  const [stock, setStock] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [loteFecha, setLoteFecha] = useState("");
  const [loteCantidad, setLoteCantidad] = useState("");
  const [lotes, setLotes] = useState<LoteTemporal[]>([]);
  const [lotesModalOpen, setLotesModalOpen] = useState(false);
  const [codigoBarras, setCodigoBarras] = useState("");

  const [listaTemporal, setListaTemporal] = useState<ProductoTemporal[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<"ok" | "warn" | "error" | "info" | "">("");
  const [importando, setImportando] = useState(false);

  const categoriasQuery = useQuery({
    queryKey: queryKeys.categorias,
    queryFn: getCategorias,
    refetchInterval: 60_000,
  });

  const proveedoresQuery = useQuery({
    queryKey: queryKeys.proveedores,
    queryFn: getProveedores,
    refetchInterval: 60_000,
  });

  const guardarBatchMutation = useMutation({
    mutationFn: crearProductosBatch,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      broadcastQueryInvalidation(queryKeys.productos);
    },
  });

  const categorias: Categoria[] = categoriasQuery.data ?? [];
  const proveedores: Proveedor[] = proveedoresQuery.data ?? [];
  const loadingSelects = categoriasQuery.isLoading || proveedoresQuery.isLoading;

  const contadorTexto = useMemo(() => {
    if (listaTemporal.length === 0) return "0 productos";
    if (listaTemporal.length === 1) return "1 producto listo";
    return `${listaTemporal.length} productos listos`;
  }, [listaTemporal]);

  const totalLotesCantidad = useMemo(() => {
    return lotes.reduce((s, l) => s + Number(l.cantidad || 0), 0);
  }, [lotes]);

  function formatFechaChip(iso: string) {
    const v = String(iso || "").slice(0, 10);
    if (!v) return "";
    const [yyyy, mm, dd] = v.split("-");
    if (!yyyy || !mm || !dd) return v;
    return `${dd}/${mm}/${yyyy}`;
  }

  function normalizeKey(raw: unknown) {
    return String(raw ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function parseNumber(raw: unknown) {
    const n = Number(String(raw ?? "").trim().replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function parseCsv(text: string) {
    const lines = String(text ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const sample = lines.slice(0, 5).join("\n");
    const delim = sample.includes(";") && !sample.includes(",") ? ";" : sample.includes(";") ? ";" : ",";

    const parseLine = (line: string) => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          const next = line[i + 1];
          if (inQuotes && next === '"') {
            cur += '"';
            i++;
            continue;
          }
          inQuotes = !inQuotes;
          continue;
        }
        if (!inQuotes && ch === delim) {
          out.push(cur);
          cur = "";
          continue;
        }
        cur += ch;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };

    const headers = parseLine(lines[0]).map(normalizeKey);
    const rows: Record<string, string>[] = [];
    for (const line of lines.slice(1)) {
      const cols = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
      rows.push(row);
    }
    return rows;
  }

  function resolveCategoriaId(raw: unknown) {
    const v = String(raw ?? "").trim();
    if (!v) return "";
    const byId = categorias.find((c) => String(c.id) === v);
    if (byId) return String(byId.id);
    const byName = categorias.find((c) => normalizeKey(c.nombre) === normalizeKey(v));
    return byName ? String(byName.id) : "";
  }

  function resolveProveedorId(raw: unknown) {
    const v = String(raw ?? "").trim();
    if (!v) return "";
    const byId = proveedores.find((p) => String(p.id) === v);
    if (byId) return String(byId.id);
    const byName = proveedores.find((p) => normalizeKey(p.nombre) === normalizeKey(v));
    return byName ? String(byName.id) : "";
  }

  async function importarArchivo(file: File) {
    const name = file.name.toLowerCase();
    setImportando(true);
    try {
      let rows: Array<Record<string, any>> = [];
      if (name.endsWith(".csv")) {
        const text = await file.text();
        rows = parseCsv(text);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
      } else {
        setMensajeEstado("Formato no soportado. Sube un CSV o XLSX.");
        setMensajeTipo("warn");
        return;
      }

      if (!rows || rows.length === 0) {
        setMensajeEstado("El archivo está vacío o no tiene filas.");
        setMensajeTipo("warn");
        return;
      }

      const unidades = new Set(["ud", "kg", "l"]);
      const nuevos: ProductoTemporal[] = [];
      for (const r of rows) {
        const normalizedRow: Record<string, any> = {};
        for (const [k, v] of Object.entries(r ?? {})) {
          normalizedRow[normalizeKey(k)] = v;
        }
        const get = (...keys: string[]) => {
          for (const k of keys) {
            const v = normalizedRow[normalizeKey(k)];
            if (v !== undefined && v !== null && String(v).trim() !== "") return v;
          }
          return "";
        };

        const nombreR = String(
          get("nombre", "producto", "nombreproducto", "nombre del producto", "nombre_producto"),
        ).trim();
        if (!nombreR) continue;

        const categoriaRaw = get("categoria", "categoriaid", "familia", "categoria id");
        const proveedorRaw = get("proveedor", "proveedorid", "proveedor id");
        const unidadRaw = String(get("unidad", "unidadmedida", "unidad_medida", "unidad de medida", "ud") || "ud")
          .trim()
          .toLowerCase();
        const unidad = unidades.has(unidadRaw) ? unidadRaw : "ud";

        const precioNum = parseNumber(get("precio", "precio_unitario", "preciounitario", "precio unitario", "0"));
        const stockNumRaw = parseNumber(get("stock", "cantidad", "0"));
        const stockMinNumRaw = parseNumber(get("minimo", "stockminimo", "stock_minimo", "stock minimo", "0"));
        const stockNum = unidad === "ud" ? Math.max(0, Math.floor(stockNumRaw)) : Math.max(0, stockNumRaw);
        const stockMinNum = unidad === "ud" ? Math.max(0, Math.floor(stockMinNumRaw)) : Math.max(0, stockMinNumRaw);

        const categoriaResolved = resolveCategoriaId(categoriaRaw);
        const proveedorResolved = resolveProveedorId(proveedorRaw);

        const codigo =
          String(get("codigobarras", "codigo_barras", "codigo", "codigo de barras", "")).trim() || generarCodigoBarras();

        const categoriaNombre =
          categorias.find((c) => String(c.id) === String(categoriaResolved))?.nombre ?? String(categoriaRaw ?? "").trim();
        const proveedorNombre =
          proveedores.find((p) => String(p.id) === String(proveedorResolved))?.nombre ?? String(proveedorRaw ?? "").trim();

        nuevos.push({
          nombre: nombreR,
          precio: Number(precioNum || 0),
          precioUnitario: unidad,
          stock: Number(stockNum || 0),
          stockMinimo: Number(stockMinNum || 0),
          categoriaId: categoriaResolved || "",
          proveedorId: proveedorResolved || "",
          unidadMedida: unidad,
          marca: String(get("marca", "Sin marca") ?? "Sin marca"),
          codigoBarras: codigo,
          lotes: [],
          alergenos: [],
          descripcion: String(get("descripcion", "") ?? ""),
          imagen: "producto-generico.jpg",
          activo: true,
          _tempCategoriaNombre: categoriaNombre,
          _tempProveedorNombre: proveedorNombre,
        });
      }

      if (nuevos.length === 0) {
        setMensajeEstado("No pude importar filas (falta la columna nombre).");
        setMensajeTipo("warn");
        return;
      }

      const incompletos = nuevos.filter((p) => !p.categoriaId || !p.proveedorId).length;
      setListaTemporal((prev) => [...prev, ...nuevos]);
      setMensajeEstado(
        incompletos > 0
          ? `Importados ${nuevos.length} productos. ${incompletos} requieren seleccionar Categoría/Proveedor antes de guardar.`
          : `Importados ${nuevos.length} productos.`,
      );
      setMensajeTipo(incompletos > 0 ? "warn" : "ok");
    } catch (e) {
      console.error(e);
      setMensajeEstado("Error importando archivo. Revisa el formato y vuelve a intentarlo.");
      setMensajeTipo("error");
    } finally {
      setImportando(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function generarCodigoBarras() {
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    return `8410001${random}`;
  }

  function limpiarInputs() {
    setNombre("");
    setCategoriaId("");
    setPrecio("");
    setUnidadMedida("ud");
    setStock("");
    setStockMin("");
    setProveedorId("");
    setLoteFecha("");
    setLoteCantidad("");
    setLotes([]);
    setCodigoBarras("");
  }

  function agregarLote() {
    const fecha = loteFecha.trim();
    const cant = Number(String(loteCantidad || "").replace(",", "."));
    if (!fecha) return;
    if (!Number.isFinite(cant) || cant <= 0) return;
    setLotes((prev) => [...prev, { fechaCaducidad: fecha.slice(0, 10), cantidad: Number(cant.toFixed(3)) }]);
    setLoteFecha("");
    setLoteCantidad("");
  }

  function eliminarLote(index: number) {
    setLotes((prev) => prev.filter((_, i) => i !== index));
  }

  function agregarALista() {
    const nombreLimpio = nombre.trim();
    const precioNum = parseFloat(precio);
    const parseNumber = (raw: string) => Number(String(raw || "").replace(",", "."));
    const stockNumRaw = parseNumber(stock);
    const stockMinNumRaw = parseNumber(stockMin);
    const stockNum =
      unidadMedida === "ud"
        ? Math.max(0, Math.floor(Number.isFinite(stockNumRaw) ? stockNumRaw : 0))
        : Math.max(0, Number.isFinite(stockNumRaw) ? stockNumRaw : 0);
    const stockMinNum =
      unidadMedida === "ud"
        ? Math.max(0, Math.floor(Number.isFinite(stockMinNumRaw) ? stockMinNumRaw : 0))
        : Math.max(0, Number.isFinite(stockMinNumRaw) ? stockMinNumRaw : 0);

    if (!nombreLimpio || !categoriaId || !proveedorId || Number.isNaN(precioNum)) {
      setMensajeEstado("Por favor completa todos los campos obligatorios.");
      setMensajeTipo("warn");
      return;
    }

    const categoriaNombre =
      categorias.find((c) => String(c.id) === String(categoriaId))?.nombre ?? "";
    const proveedorNombre =
      proveedores.find((p) => String(p.id) === String(proveedorId))?.nombre ?? "";

    const unidadLabel = unidadMedida === "kg" ? "kg" : unidadMedida === "l" ? "l" : "ud";
    const lotesNormalizados = lotes.map((l) => ({
      fechaCaducidad: l.fechaCaducidad.slice(0, 10),
      cantidad: Number(l.cantidad),
    }));
    const stockFromLotes =
      lotesNormalizados.length > 0
        ? lotesNormalizados.reduce((s, l) => s + Number(l.cantidad || 0), 0)
        : stockNum;

    const nuevoProducto: ProductoTemporal = {
      nombre: nombreLimpio,
      precio: precioNum,
      precioUnitario: unidadLabel,
      stock: stockFromLotes,
      stockMinimo: stockMinNum,
      categoriaId,
      proveedorId,
      unidadMedida: unidadLabel,
      marca: "Sin marca",
      codigoBarras: codigoBarras.trim() || generarCodigoBarras(),
      lotes: lotesNormalizados,
      alergenos: [],
      descripcion: "",
      imagen: "producto-generico.jpg",
      activo: true,
      _tempCategoriaNombre: categoriaNombre,
      _tempProveedorNombre: proveedorNombre,
    };

    setListaTemporal((prev) => [...prev, nuevoProducto]);
    limpiarInputs();
    setMensajeEstado("Producto agregado a la lista temporal.");
    setMensajeTipo("ok");
  }

  function borrarFila(index: number) {
    setListaTemporal((prev) => prev.filter((_, i) => i !== index));
  }

  async function limpiarLista() {
    if (listaTemporal.length === 0) return;

    const confirmado = await showConfirm({
      title: "Descartar lista",
      message: "¿Estás seguro de descartar toda la lista?",
      confirmLabel: "Descartar",
      variant: "danger",
      icon: "fa-solid fa-trash",
    });
    if (!confirmado) return;

    setListaTemporal([]);
    setMensajeEstado("Lista limpiada.");
    setMensajeTipo("info");
  }

  async function guardarEnBaseDeDatos() {
    if (listaTemporal.length === 0) return;

    const confirmado = await showConfirm({
      title: "Confirmar importación",
      message: `¿Confirmas importar ${listaTemporal.length} producto${listaTemporal.length !== 1 ? "s" : ""} al inventario?`,
      confirmLabel: "Importar",
      icon: "fa-solid fa-file-import",
    });
    if (!confirmado) return;

    try {
      setGuardando(true);
      setMensajeEstado("Procesando...");
      setMensajeTipo("info");

      const productosLimpios = listaTemporal.map((producto) => ({
            nombre: producto.nombre,
            precio: producto.precio,
            precioUnitario: producto.precioUnitario,
            stock: producto.stock,
            stockMinimo: producto.stockMinimo,
            categoriaId: producto.categoriaId,
            proveedorId: producto.proveedorId,
            unidadMedida: producto.unidadMedida,
            marca: producto.marca,
            codigoBarras: producto.codigoBarras,
            fechaCaducidad: null,
            alergenos: producto.alergenos,
            descripcion: producto.descripcion,
            imagen: producto.imagen,
            activo: producto.activo,
      }));

      try {
        await guardarBatchMutation.mutateAsync(productosLimpios);

        const anyLotes = listaTemporal.some((p) => p.lotes.length > 0);
        if (anyLotes) {
          const productosActuales = await getProductos();
          const mapByBarcode = new Map<string, any>();
          for (const p of productosActuales as any[]) {
            const cb = String((p as any).codigoBarras ?? (p as any).codigobarras ?? "").trim();
            if (cb) mapByBarcode.set(cb, p);
          }

          const lotesPayload = listaTemporal.flatMap((p) => {
            const created = mapByBarcode.get(String(p.codigoBarras));
            const pid = String(created?.id ?? "");
            if (!pid) return [];
            return p.lotes.map((l) => ({
              productoId: pid,
              fechaCaducidad: l.fechaCaducidad,
              cantidad: l.cantidad,
            }));
          });

          if (lotesPayload.length > 0) {
            await crearLotesBatch(lotesPayload);
            await queryClient.invalidateQueries({ queryKey: queryKeys.lotesProducto });
            broadcastQueryInvalidation(queryKeys.lotesProducto);
          }
        }

        setMensajeEstado(`¡Éxito! Se guardaron ${productosLimpios.length} productos correctamente.`);
        setMensajeTipo("ok");
        setListaTemporal([]);
      } catch (error) {
        console.error("Error guardando productos en lote:", error);
        setMensajeEstado("Error al guardar los productos. Inténtalo de nuevo.");
        setMensajeTipo("error");
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-2 px-[18px] py-2.5 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] rounded-[10px] font-semibold text-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-[background,color,border-color,transform,box-shadow] duration-200 hover:bg-[var(--color-border-default)] hover:text-[var(--color-text-strong)] hover:border-[var(--color-border-strong)] hover:-translate-x-[3px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          icon="fa-solid fa-arrow-left"
          onClick={() => nav("/inventario")}
        >
          Volver al Inventario
        </Button>
      </div>

      <h1 className="text-center text-[var(--color-brand-500)] mb-6 font-bold tracking-wide">
        INGRESO MASIVO DE MERCANCÍA
      </h1>

      <div className="mb-4 flex items-center justify-end gap-3 flex-wrap">
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importarArchivo(f);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="px-6"
          onClick={() => importInputRef.current?.click()}
          disabled={importando || loadingSelects}
        >
          {loadingSelects ? "Cargando catálogos..." : importando ? "Importando..." : "Importar CSV/XLSX"}
        </Button>
      </div>

      <div className="bg-[var(--color-bg-surface)] p-[25px] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-black/5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6 items-end">
          <div className="flex flex-col gap-2 xl:col-span-2">
            <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputNombre">
              Nombre del Producto
            </label>
            <input
              id="inputNombre"
              type="text"
              className="h-11 w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
              placeholder="Ej: Leche Entera"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputCodigoBarras">
              Código de barras
            </label>
            <input
              id="inputCodigoBarras"
              type="text"
              className="h-11 w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
              placeholder="Ej: 8410001000012"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="selectCategoria">
              Categoría
            </label>
            <UiSelect
              id="selectCategoria"
              value={categoriaId}
              onChange={setCategoriaId}
              disabled={loadingSelects}
              placeholder={loadingSelects ? "Cargando..." : "Seleccionar..."}
              options={[
                { value: "", label: loadingSelects ? "Cargando..." : "Seleccionar..." },
                ...categorias.map((c) => ({ value: String(c.id), label: c.nombre })),
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="selectUnidadMedida">
              Unidad
            </label>
            <UiSelect
              id="selectUnidadMedida"
              value={unidadMedida}
              onChange={(v) => setUnidadMedida((v as any) || "ud")}
              options={[
                { value: "ud", label: "Unidades (ud)" },
                { value: "kg", label: "Peso (kg)" },
                { value: "l", label: "Volumen (l)" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputPrecio">
              Precio ({unidadMedida === "kg" ? "€/kg" : unidadMedida === "l" ? "€/l" : "€/ud"})
            </label>
            <input
              id="inputPrecio"
              type="number"
              className="h-11 w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
              placeholder="0.00"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputStock">
              Stock
            </label>
            <input
              id="inputStock"
              type="number"
              className="h-11 w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
              placeholder="0"
              step={unidadMedida === "ud" ? "1" : "0.001"}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputStockMin">
              Mínimo
            </label>
            <input
              id="inputStockMin"
              type="number"
              className="h-11 w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
              placeholder="5"
              step={unidadMedida === "ud" ? "1" : "0.001"}
              value={stockMin}
              onChange={(e) => setStockMin(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 xl:col-span-2">
            <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="selectProveedor">
              Proveedor
            </label>
            <UiSelect
              id="selectProveedor"
              value={proveedorId}
              onChange={setProveedorId}
              disabled={loadingSelects}
              placeholder={loadingSelects ? "Cargando..." : "Seleccionar..."}
              options={[
                { value: "", label: loadingSelects ? "Cargando..." : "Seleccionar..." },
                ...proveedores.map((p) => ({ value: String(p.id), label: p.nombre })),
              ]}
            />
          </div>

          <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Caducidad por lotes
                </p>
                <p className="m-0 mt-1 text-[14px] font-extrabold text-slate-900">
                  {lotes.length === 0
                    ? "Gestionar lotes"
                    : `${lotes.length} lote${lotes.length !== 1 ? "s" : ""} · Total: ${totalLotesCantidad}`}
                </p>
                <p className="m-0 mt-1 text-[12px] leading-snug text-slate-500">
                  Si añades lotes, el stock se calculará como la suma.
                </p>
              </div>

              <button
                type="button"
                className="no-global-button h-11 min-w-[130px] rounded-lg border border-[var(--color-control-border)] bg-white px-4 text-[13px] font-semibold text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition hover:-translate-y-px hover:bg-slate-50 active:translate-y-0"
                onClick={() => setLotesModalOpen(true)}
                title="Gestionar lotes"
              >
                Gestionar
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center xl:col-span-6">
            <Button
              type="button"
              variant="danger"
              size="lg"
              className="h-12 w-full max-w-[260px]"
              icon="fa-solid fa-plus"
              onClick={agregarALista}
            >
              Agregar
            </Button>
          </div>
        </div>
      </div>

      {lotesModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setLotesModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLotesModalOpen(false);
          }}
          tabIndex={-1}
        >
          <div className="w-full max-w-[720px] rounded-2xl bg-white shadow-[0_20px_80px_rgba(0,0,0,0.25)] border border-black/10 overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 py-4 bg-[var(--color-bg-soft)]">
              <div>
                <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500">Lotes</div>
                <div className="text-[16px] font-extrabold text-[var(--color-text-strong)] leading-tight">
                  Caducidad por lote
                </div>
                <div className="text-[13px] text-slate-600 mt-0.5">
                  Añade una fecha de caducidad y su cantidad. Puedes quitar lotes tocando la ✕.
                </div>
              </div>
              <button
                type="button"
                className="no-global-button inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setLotesModalOpen(false)}
                aria-label="Cerrar"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="grid grid-cols-[minmax(0,1fr)_180px_auto] gap-3 items-end max-[520px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Fecha
                  </label>
                  <input
                    type="date"
                    className="h-11 w-full px-3.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
                    value={loteFecha}
                    onChange={(e) => setLoteFecha(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    step={unidadMedida === "ud" ? "1" : "0.001"}
                    placeholder="0"
                    className="h-11 w-full px-3.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
                    value={loteCantidad}
                    onChange={(e) => setLoteCantidad(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="no-global-button h-11 whitespace-nowrap rounded-lg border border-[var(--color-control-border-strong)] bg-[var(--brand-600)] px-5 text-[13px] font-extrabold text-white shadow-[0_10px_25px_rgba(30,64,175,0.18)] transition hover:brightness-105 active:brightness-95"
                  onClick={agregarLote}
                >
                  Añadir
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[13px] text-slate-600">
                  {lotes.length === 0 ? "Sin lotes añadidos." : `${lotes.length} lote${lotes.length !== 1 ? "s" : ""} · Total: ${totalLotesCantidad}`}
                </div>
                {lotes.length > 0 ? (
                  <button
                    type="button"
                    className="no-global-button text-[13px] font-semibold text-slate-700 hover:underline"
                    onClick={() => setLotes([])}
                  >
                    Quitar todos
                  </button>
                ) : null}
              </div>

              {lotes.length > 0 ? (
                <div className="mt-3 grid gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {lotes
                    .slice()
                    .sort((a, b) => String(a.fechaCaducidad).localeCompare(String(b.fechaCaducidad)))
                    .map((l, idx) => (
                      <div
                        key={`${l.fechaCaducidad}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-extrabold text-slate-900 truncate">
                            {formatFechaChip(l.fechaCaducidad)}
                          </div>
                          <div className="text-[12px] text-slate-500 mt-0.5">
                            Cantidad: <span className="font-semibold text-slate-700">{l.cantidad}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="no-global-button inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => eliminarLote(lotes.findIndex((x) => x === l))}
                          title="Quitar"
                          aria-label="Quitar"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-[13px] text-slate-600">
                  Añade lotes si quieres controlar la caducidad por cada entrada.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 bg-[var(--color-bg-soft)] border-t border-black/5">
              <button
                type="button"
                className="no-global-button h-11 rounded-lg border border-[var(--color-control-border)] bg-white px-5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
                onClick={() => setLotesModalOpen(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-[35px]">
        <h3 className="text-[var(--color-text-strong)] mb-4 flex items-center gap-2.5 text-[1.1rem] flex-wrap">
          <i className="fa-solid fa-list-check"></i> Lista de Previsualización
          <span className="text-[12px] bg-[var(--color-border-default)] text-[var(--color-text-muted)] px-2.5 py-1 rounded-xl font-semibold">
            {contadorTexto}
          </span>
        </h3>

        <div className="overflow-x-auto rounded-xl border border-black/5 shadow-[var(--shadow-sm)]">
          <Table className="overflow-hidden rounded-xl bg-[var(--color-bg-surface)]">
          <TableHeader>
            <TableRow className="bg-[var(--color-bg-soft)] hover:bg-[var(--color-bg-soft)]">
              <TableHead className="text-[13px] font-semibold normal-case tracking-normal text-[var(--color-text-muted)]">Nombre</TableHead>
              <TableHead className="text-[13px] font-semibold normal-case tracking-normal text-[var(--color-text-muted)]">Categoría</TableHead>
              <TableHead className="text-[13px] font-semibold normal-case tracking-normal text-[var(--color-text-muted)]">Precio</TableHead>
              <TableHead className="text-[13px] font-semibold normal-case tracking-normal text-[var(--color-text-muted)]">Stock</TableHead>
              <TableHead className="text-[13px] font-semibold normal-case tracking-normal text-[var(--color-text-muted)]">Proveedor</TableHead>
              <TableHead className="text-[13px] font-semibold normal-case tracking-normal text-[var(--color-text-muted)]">Código barras</TableHead>
              <TableHead className="text-center text-[13px] font-semibold normal-case tracking-normal text-[var(--color-text-muted)]">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listaTemporal.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-5">
                  <EmptyState
                    icon="fa-solid fa-box-open"
                    title="Lista vacía"
                    description="Agrega productos para previsualizar antes de confirmar la importación."
                  />
                </TableCell>
              </TableRow>
            ) : (
              listaTemporal.map((prod, index) => (
                <TableRow key={`${prod.codigoBarras}-${index}`} className="bo-table-row">
                  <TableCell className="text-[14px] text-[var(--color-text-strong)]">{prod.nombre}</TableCell>
                  <TableCell className="text-[14px] text-[var(--color-text-strong)]">{prod._tempCategoriaNombre}</TableCell>
                  <TableCell className="text-[14px] text-[var(--color-text-strong)]">
                    {prod.precio.toFixed(2)} €/{prod.unidadMedida || "ud"}
                  </TableCell>
                  <TableCell className="text-[14px] text-[var(--color-text-strong)]">{prod.stock}</TableCell>
                  <TableCell className="text-[14px] text-[var(--color-text-strong)]">{prod._tempProveedorNombre}</TableCell>
                  <TableCell className="text-[14px] text-[var(--color-text-strong)]">
                    {prod.codigoBarras || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      className="bo-table-action-btn inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#e53e3e] shadow-[0_2px_4px_rgba(229,62,62,0.1)] transition-transform duration-200 hover:scale-105 hover:bg-[#fed7d7]"
                      onClick={() => borrarFila(index)}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end gap-5 mt-6 mb-5 pt-5 border-t border-t-[var(--color-border-default)] flex-wrap">
        <Button
          type="button"
          variant="secondary"
          className={`h-11 px-7 border-0 rounded-[10px] font-semibold text-[14px] cursor-pointer inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_rgba(229,62,62,0.3)] transition-[transform,box-shadow,filter] duration-200 bg-[linear-gradient(135deg,#fc8181_0%,#e53e3e_100%)] text-white hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(229,62,62,0.4)] hover:brightness-105 active:translate-y-px disabled:opacity-70 disabled:cursor-not-allowed ${listaTemporal.length === 0 ? "hidden" : ""}`}
          icon="fa-solid fa-trash"
          onClick={limpiarLista}
        >
          Descartar Todo
        </Button>

        <Button
          type="button"
          variant="primary"
          className={`h-11 px-9 border-0 rounded-[10px] font-semibold text-[15px] cursor-pointer inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_rgba(56,161,105,0.3)] transition-[transform,box-shadow,filter] duration-200 bg-[linear-gradient(135deg,#48bb78_0%,#38a169_100%)] text-white tracking-wide hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(56,161,105,0.4)] hover:brightness-105 active:translate-y-px disabled:opacity-70 disabled:cursor-not-allowed ${listaTemporal.length === 0 ? "hidden" : ""}`}
          icon="fa-solid fa-cloud-arrow-up"
          onClick={guardarEnBaseDeDatos}
          disabled={listaTemporal.length === 0}
          loading={guardando}
        >
          CONFIRMAR E IMPORTAR
        </Button>
      </div>

      {mensajeEstado && (
        <Alert
          type={
            mensajeTipo === "ok" ? "success"
            : mensajeTipo === "warn" ? "warning"
            : mensajeTipo === "error" ? "error"
            : "info"
          }
        >
          {mensajeEstado}
        </Alert>
      )}
    </div>
  );
}