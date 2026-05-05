import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProductos, type Producto } from "../services/productosService";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import BackofficeTablePanel from "../components/ui/BackofficeTablePanel";
import { Badge } from "../components/ui/badge";
import SearchInput from "../components/ui/SearchInput";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { showConfirm, showNotification } from "../utils/notifications";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useAuth } from "../contexts/AuthContext";
import { deleteEscandallo, getEscandallos, saveEscandallo } from "../services/escandallosService";
import type { Escandallo, EscandalloItem } from "../types";
import { queryKeys } from "../lib/queryClient";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import { Eye, Pencil, ReceiptText, Trash2 } from "lucide-react";

export default function EscandallosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [busquedaReceta, setBusquedaReceta] = useState("");
  const [busquedaIngrediente, setBusquedaIngrediente] = useState("");
  const [filtroReceta, setFiltroReceta] = useState("");
  const [filtroIngrediente, setFiltroIngrediente] = useState("");
  const debouncedBusquedaReceta = useDebouncedValue(busquedaReceta, 300);
  const debouncedBusquedaIngrediente = useDebouncedValue(busquedaIngrediente, 300);

  const [modalOpen, setModalOpen] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);
  const [detalleEscandallo, setDetalleEscandallo] = useState<Escandallo | null>(null);

  const [editEscandalloId, setEditEscandalloId] = useState<number | null>(null);
  const [nombrePlato, setNombrePlato] = useState("");
  const [pvpPlato, setPvpPlato] = useState("0");
  const [elaboracionPlato, setElaboracionPlato] = useState("");

  const [ingredientesReceta, setIngredientesReceta] = useState<EscandalloItem[]>([]);
  const [productoIngredienteId, setProductoIngredienteId] = useState("");
  const [cantidadIngrediente, setCantidadIngrediente] = useState("");
  const [busquedaProductoIngrediente, setBusquedaProductoIngrediente] = useState("");
  const [mostrarSugerenciasIngrediente, setMostrarSugerenciasIngrediente] = useState(false);

  const productosQuery = useQuery({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
  });

  const escandallosQuery = useQuery({
    queryKey: queryKeys.escandallos,
    queryFn: getEscandallos,
  });

  const saveEscandalloMutation = useMutation({
    mutationFn: ({ payload, id }: { payload: Parameters<typeof saveEscandallo>[0]; id?: number | null }) =>
      saveEscandallo(payload, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.escandallos });
    },
  });

  const deleteEscandalloMutation = useMutation({
    mutationFn: deleteEscandallo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.escandallos });
    },
  });

  const todosLosProductos = useMemo(() => {
    const lista = Array.isArray(productosQuery.data) ? [...productosQuery.data] : [];

    if (!lista.find((p) => String(p.nombre).trim().toLowerCase() === "sal")) {
      lista.push({
        id: "999",
        nombre: "Sal",
        precio: 0.6,
        stock: 0,
        proveedorId: null,
        categoriaId: null,
      } as Producto);
    }

    return lista;
  }, [productosQuery.data]);

  const escandallos = escandallosQuery.data ?? [];

  const loadingProductos = productosQuery.isLoading;
  const loadingEscandallos = escandallosQuery.isLoading;
  const err =
    (productosQuery.error instanceof Error && productosQuery.error.message)
    || (escandallosQuery.error instanceof Error && escandallosQuery.error.message)
    || "";

  useEffect(() => {
    setFiltroReceta(debouncedBusquedaReceta);
    setFiltroIngrediente(debouncedBusquedaIngrediente);
  }, [debouncedBusquedaIngrediente, debouncedBusquedaReceta]);

  const escandallosFiltrados = useMemo(() => {
    const textoReceta = filtroReceta.trim().toLowerCase();
    const textoIngrediente = filtroIngrediente.trim().toLowerCase();

    return escandallos.filter((esc) => {
      const coincideNombre = esc.nombre.toLowerCase().includes(textoReceta);

      let coincideIngrediente = true;
      if (textoIngrediente) {
        coincideIngrediente = esc.items.some((item) =>
          item.nombre.toLowerCase().includes(textoIngrediente),
        );
      }

      return coincideNombre && coincideIngrediente;
    });
  }, [escandallos, filtroReceta, filtroIngrediente]);

  const productoIngredienteSeleccionado = useMemo(
    () => todosLosProductos.find((producto) => String(producto.id) === String(productoIngredienteId)) ?? null,
    [productoIngredienteId, todosLosProductos],
  );

  const productosSugeridos = useMemo(() => {
    const texto = busquedaProductoIngrediente.trim().toLowerCase();
    if (texto.length < 2) {
      return [];
    }

    return todosLosProductos
      .filter((producto) => producto.nombre.toLowerCase().includes(texto))
      .slice(0, 8);
  }, [busquedaProductoIngrediente, todosLosProductos]);

  const costeTotal = useMemo(() => {
    return ingredientesReceta.reduce(
      (sum, ing) => sum + ing.cantidad * ing.precio,
      0,
    );
  }, [ingredientesReceta]);

  const pvp = Number.parseFloat(pvpPlato || "0") || 0;
  const beneficioNeto = pvp - costeTotal;
  const margenBeneficio = pvp > 0 ? (beneficioNeto / pvp) * 100 : 0;

  function abrirNuevaReceta() {
    limpiarFormulario();
    setModoLectura(false);
    setModalOpen(true);
  }

  function abrirEditarReceta(esc: Escandallo) {
    cargarRecetaEnFormulario(esc, false);
  }

  function abrirVerReceta(esc: Escandallo) {
    setDetalleEscandallo({
      ...esc,
      items: getEscandalloItems(esc),
    });
  }

  function cerrarDetalle() {
    setDetalleEscandallo(null);
  }

  function cargarRecetaEnFormulario(esc: Escandallo, readonly: boolean) {
    setEditEscandalloId(esc.id);
    setNombrePlato(esc.nombre);
    setPvpPlato(String(esc.pvp));
    setElaboracionPlato(esc.elaboracion || "");
    setIngredientesReceta([...(esc.items || [])]);
    setProductoIngredienteId("");
    setCantidadIngrediente("");
    setBusquedaProductoIngrediente("");
    setMostrarSugerenciasIngrediente(false);
    setModoLectura(readonly);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
  }

  function getEscandalloItems(escandallo: Escandallo | null | undefined) {
    return Array.isArray(escandallo?.items) ? escandallo.items : [];
  }

  function limpiarFormulario() {
    setEditEscandalloId(null);
    setNombrePlato("");
    setPvpPlato("0");
    setElaboracionPlato("");
    setIngredientesReceta([]);
    setProductoIngredienteId("");
    setCantidadIngrediente("");
    setBusquedaProductoIngrediente("");
    setMostrarSugerenciasIngrediente(false);
  }

  function seleccionarIngrediente(producto: Producto) {
    setProductoIngredienteId(String(producto.id));
    setBusquedaProductoIngrediente(producto.nombre);
    setMostrarSugerenciasIngrediente(false);
  }

  function agregarIngrediente() {
    const prodId = productoIngredienteId;
    const cantidad = Number.parseFloat(cantidadIngrediente);

    if (!prodId || Number.isNaN(cantidad) || cantidad <= 0) {
      showNotification("Selecciona un producto y una cantidad válida.", "warning");
      return;
    }

    const producto = todosLosProductos.find(
      (p) => String(p.id) === String(prodId),
    );
    if (!producto) return;

    setIngredientesReceta((prev) => {
      const idx = prev.findIndex(
        (i) => String(i.producto_id) === String(prodId),
      );
      if (idx >= 0) {
        return prev.map((item, index) =>
          index === idx
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item,
        );
      }

      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          cantidad,
        },
      ];
    });

    setProductoIngredienteId("");
    setCantidadIngrediente("");
    setBusquedaProductoIngrediente("");
    setMostrarSugerenciasIngrediente(false);
  }

  function eliminarIngrediente(index: number) {
    setIngredientesReceta((prev) => prev.filter((_, i) => i !== index));
  }

  function actualizarCantidadIngrediente(index: number, cantidad: string) {
    const parsed = Number.parseFloat(cantidad);
    setIngredientesReceta((prev) => prev.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      return {
        ...item,
        cantidad: Number.isNaN(parsed) || parsed <= 0 ? item.cantidad : parsed,
      };
    }));
  }

  async function guardarEscandallo(e: React.FormEvent) {
    e.preventDefault();

    if (ingredientesReceta.length === 0) {
      showNotification("La receta debe tener al menos un ingrediente.", "warning");
      return;
    }

    const payload = {
    nombre: nombrePlato.trim(),
    pvp: Number(String(pvpPlato).replace(",", ".")) || 0,
    elaboracion: elaboracionPlato,
    items: [...ingredientesReceta],
    autor: String(user?.nombre ?? user?.username ?? "Admin"),
  } as Parameters<typeof saveEscandallo>[0];

    if (!payload.nombre) {
      showNotification("El nombre del plato es obligatorio.", "warning");
      return;
    }

    await saveEscandalloMutation.mutateAsync({ payload, id: editEscandalloId });

    cerrarModal();
    limpiarFormulario();
    showNotification("Receta guardada correctamente.", "success");
  }

  async function eliminarEscandallo(id: number) {
    const esc = escandallos.find((x) => x.id === id);
    if (!esc) {
      showNotification("Error: Receta no encontrada.", "error");
      return;
    }

    const confirmado = await showConfirm({
      title: "Eliminar receta",
      message: `¿Eliminar la receta "${esc.nombre}"?\n\nEsta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      variant: "danger",
      icon: "fa-solid fa-trash",
    });
    if (!confirmado) return;

    await deleteEscandalloMutation.mutateAsync(id);
    showNotification("Receta eliminada correctamente.", "success");
  }

  function aplicarFiltros() {
    setFiltroReceta(busquedaReceta);
    setFiltroIngrediente(busquedaIngrediente);
  }

  function mostrarTodo() {
    setBusquedaReceta("");
    setBusquedaIngrediente("");
    setFiltroReceta("");
    setFiltroIngrediente("");
  }

  function classMargenTabla(margen: number) {
    if (margen < 20) return "text-[#e53e3e] font-bold";
    if (margen < 50) return "text-[#dd6b20] font-bold";
    return "text-[#38a169] font-bold";
  }

  function classMargenResumen(margen: number) {
    if (margen < 20) return "text-[#e53e3e]";
    if (margen < 50) return "text-[#dd6b20]";
    return "text-[#38a169]";
  }

  function classMargenBadge(margen: number) {
    if (margen < 20) return "bg-red-50 text-red-700 ring-red-200";
    if (margen < 50) return "bg-amber-50 text-amber-700 ring-amber-200";
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  const detalleItems = getEscandalloItems(detalleEscandallo);
  const detalleCoste = detalleItems.reduce(
    (sum, item) => sum + Number(item.cantidad) * Number(item.precio),
    0,
  );
  const detallePvp = Number(detalleEscandallo?.pvp ?? 0);
  const detalleMargen = detallePvp > 0 ? ((detallePvp - detalleCoste) / detallePvp) * 100 : 0;

  return (
    <StaggerPage className="w-full mb-8">
      <StaggerItem className="mb-6 w-full">
        <h1 className="m-0 mb-6 flex items-center gap-3 text-[28px] font-extrabold text-[var(--color-brand-500)]">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <ReceiptText className="h-5 w-5" />
          </span>
          Escandallos y Recetas
        </h1>

        <div className="mb-7 flex items-end gap-4 rounded-[30px] border border-slate-200/90 bg-white px-[25px] py-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] flex-wrap max-[768px]:flex-col max-[768px]:items-stretch">
          <div className="flex flex-col gap-1.5 min-w-[200px] flex-grow">
            <label htmlFor="busquedaEscandallos" className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Buscar Receta
            </label>
            <SearchInput
              value={busquedaReceta}
              onChange={setBusquedaReceta}
              placeholder="Buscar por nombre..."
              ariaLabel="Buscar receta por nombre"
            />
          </div>

          <div className="flex flex-col gap-1.5 min-w-[200px] flex-grow">
            <label htmlFor="busquedaIngrediente" className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Buscar por Ingrediente
            </label>
            <SearchInput
              value={busquedaIngrediente}
              onChange={setBusquedaIngrediente}
              placeholder="Por ingrediente..."
              ariaLabel="Buscar receta por ingrediente"
            />
          </div>

          <Button type="button" variant="secondary" className="h-11" onClick={mostrarTodo}>
            <i className="fa-solid fa-sync"></i> Mostrar Todo
          </Button>

          <Button type="button" variant="primary" className="h-11 max-[768px]:w-full" onClick={abrirNuevaReceta}>
            <i className="fa-solid fa-plus"></i> Nueva Receta
          </Button>
        </div>
      </StaggerItem>

      {(loadingProductos || loadingEscandallos) && <Spinner label="Cargando datos..." />}
      {err && <Alert type="error">{err}</Alert>}

      <StaggerItem>
        <BackofficeTablePanel
          header={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 text-[18px] font-semibold text-[var(--color-text-strong)]">Listado de Recetas</h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="outline" className="border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {escandallosFiltrados.length} receta(s)
                </Badge>
              </div>
            </div>
          }
        >
          {/* Móvil/Tablet (incluye iPad): cards (evita tablas aplastadas) */}
          <div className="hidden max-[1366px]:block">
            {escandallosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No se encontraron recetas.</div>
            ) : (
              <div className="grid gap-3">
                {escandallosFiltrados.map((esc) => {
                  const margen = esc.pvp > 0 ? ((esc.pvp - esc.coste) / esc.pvp) * 100 : 0;
                  return (
                    <div
                      key={`esc-m-${esc.id}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-extrabold text-slate-900">{esc.nombre}</div>
                          <div className="mt-1 text-[12px] text-slate-500">
                            Autor: <span className="font-semibold text-slate-700">{esc.autor || "Admin"}</span> ·{" "}
                            {esc.items?.length ?? 0} ingredientes
                          </div>
                        </div>
                        <Badge
                          variant={margen < 20 ? "destructive" : margen < 50 ? "warning" : "success"}
                          className="px-3 py-1 text-[11px] font-semibold shrink-0"
                        >
                          {margen.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Coste</div>
                          <div className="text-[13px] font-extrabold text-slate-900">{esc.coste.toFixed(2)} €</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">PVP</div>
                          <div className="text-[13px] font-extrabold text-slate-900">{esc.pvp.toFixed(2)} €</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          className="bo-table-action-btn w-full justify-center text-slate-600 hover:bg-slate-50"
                          onClick={() => abrirVerReceta(esc)}
                          title="Ver"
                        >
                          <Eye strokeWidth={1.5} size={18} />
                        </button>
                        <button
                          type="button"
                          className="bo-table-action-btn w-full justify-center text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => abrirEditarReceta(esc)}
                          title="Editar"
                        >
                          <Pencil strokeWidth={1.5} size={18} />
                        </button>
                        <button
                          type="button"
                          className="bo-table-action-btn w-full justify-center text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => eliminarEscandallo(esc.id)}
                          title="Eliminar"
                        >
                          <Trash2 strokeWidth={1.5} size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop grande: tabla */}
          <div className="overflow-x-auto max-[1366px]:hidden">
            <Table className="min-w-[1120px] overflow-hidden rounded-[24px] border border-slate-100 bg-white">
              <TableHeader>
                <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="rounded-l-2xl whitespace-nowrap min-w-[240px]">Nombre</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[140px]">Autor</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[130px]">Ingredientes</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[130px]">Coste total</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[110px]">PVP</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[140px]">Beneficio %</TableHead>
                  <TableHead className="rounded-r-2xl whitespace-nowrap text-center min-w-[160px] w-[160px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escandallosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                      No se encontraron recetas.
                    </TableCell>
                  </TableRow>
                ) : (
                  escandallosFiltrados.map((esc) => {
                    const margen = esc.pvp > 0 ? ((esc.pvp - esc.coste) / esc.pvp) * 100 : 0;

                    return (
                      <TableRow key={esc.id} className="bo-table-row">
                        <TableCell>
                          <span className="block max-w-full truncate text-sm font-semibold text-slate-700">
                            {esc.nombre}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">{esc.autor || "Admin"}</TableCell>
                        <TableCell className="text-sm text-slate-700">{esc.items?.length ?? 0} ingredientes</TableCell>
                        <TableCell className="text-sm text-slate-700">{esc.coste.toFixed(2)} €</TableCell>
                        <TableCell className="text-sm text-slate-700">{esc.pvp.toFixed(2)} €</TableCell>
                        <TableCell>
                          <Badge
                            variant={margen < 20 ? "destructive" : margen < 50 ? "warning" : "success"}
                            className="px-3 py-1 text-[11px] font-semibold"
                          >
                            {margen.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center pr-4">
                          <div className="inline-flex min-w-[120px] justify-center gap-2">
                            <button
                              type="button"
                              className="bo-table-action-btn text-slate-500"
                              title="Ver detalle"
                              onClick={() => abrirVerReceta(esc)}
                            >
                              <Eye strokeWidth={1.5} size={18} />
                            </button>
                            <button
                              type="button"
                              className="bo-table-action-btn text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              title="Editar"
                              onClick={() => abrirEditarReceta(esc)}
                            >
                              <Pencil strokeWidth={1.5} size={18} />
                            </button>
                            <button
                              type="button"
                              className="bo-table-action-btn text-red-500 hover:bg-red-50 hover:text-red-600"
                              title="Eliminar"
                              onClick={() => eliminarEscandallo(esc.id)}
                            >
                              <Trash2 strokeWidth={1.5} size={18} />
                            </button>
                          </div>
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

      <AnimatePresence>
        {detalleEscandallo && (
          <motion.div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
          <motion.div
            className="w-full max-w-[850px] max-h-[calc(100dvh-2.5rem)] overflow-hidden rounded-[24px] bg-[var(--color-bg-surface)] shadow-2xl ring-1 ring-slate-200 flex flex-col min-h-0"
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="sticky top-0 z-10 shrink-0 flex items-start justify-between gap-4 border-b border-b-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-5 py-4">
              <div>
                <h2 className="m-0 text-[1.15rem] font-bold text-[var(--color-text-strong)]">
                  {detalleEscandallo.nombre}
                </h2>
                <p className="mt-1 text-[13px] font-medium text-[var(--color-text-muted)]">
                  Ficha de escandallo • Autor: {detalleEscandallo.autor || "Admin"}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarDetalle}
                className="no-global-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[#50596D] shadow-sm transition hover:bg-slate-50 hover:text-[var(--color-brand-500)] active:scale-95"
                aria-label="Cerrar ventana"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="px-5 py-4 flex-1 overflow-y-auto overscroll-contain">
              <div className="grid gap-3 md:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                  <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Coste total
                  </span>
                  <span className="mt-1.5 block text-xl font-black text-slate-800">
                    {detalleCoste.toFixed(2)} €
                  </span>
                </article>

                <article className="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-center">
                  <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[var(--color-brand-500)]">
                    PVP
                  </span>
                  <span className="mt-1.5 block text-xl font-black text-[var(--color-brand-500)]">
                    {detallePvp.toFixed(2)} €
                  </span>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                  <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Margen
                  </span>
                  <span className={`mt-1.5 inline-flex rounded-full px-3 py-1 text-lg font-black ring-1 ${classMargenBadge(detalleMargen)}`}>
                    {detalleMargen.toFixed(1)}%
                  </span>
                </article>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm min-w-0">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="h-[2px] w-6 bg-[var(--color-brand-500)]"></span>
                    <h3 className="m-0 text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                      Ingredientes
                    </h3>
                  </div>

                  <div className="overflow-x-auto w-full pb-2">
                    <Table className="w-full min-w-[500px] overflow-hidden rounded-xl border border-slate-100 bg-white">
                      <TableHeader>
                        <TableRow className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:bg-slate-50">
                          <TableHead className="px-3 py-2.5 normal-case tracking-[0.15em] text-slate-400 min-w-[180px]">Producto</TableHead>
                          <TableHead className="px-3 py-2.5 text-center normal-case tracking-[0.15em] text-slate-400 whitespace-nowrap">Cant.</TableHead>
                          <TableHead className="px-3 py-2.5 text-right normal-case tracking-[0.15em] text-slate-400 whitespace-nowrap">Coste ud.</TableHead>
                          <TableHead className="px-3 py-2.5 text-right normal-case tracking-[0.15em] text-slate-400 whitespace-nowrap">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detalleItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="px-3 py-6 text-center text-xs text-slate-500">
                              Este escandallo no tiene ingredientes registrados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          detalleItems.map((item, index) => {
                            const subtotal = Number(item.cantidad) * Number(item.precio);
                            return (
                              <TableRow key={`${item.producto_id}-${index}`} className="bo-table-row">
                                <TableCell className="px-3 py-2.5 font-bold uppercase tracking-[0.05em] text-slate-700 text-xs whitespace-normal align-middle">
                                  {item.nombre}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-center text-slate-500 text-xs whitespace-nowrap align-middle">
                                  {item.cantidad}
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-right text-slate-500 text-xs whitespace-nowrap align-middle">
                                  {Number(item.precio).toFixed(2)} €
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-right font-bold text-slate-700 text-xs whitespace-nowrap align-middle">
                                  {subtotal.toFixed(2)} €
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 min-w-0">
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="h-[2px] w-6 bg-[var(--color-brand-500)]"></span>
                    <h3 className="m-0 text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                      Elaboración
                    </h3>
                  </div>

                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap">
                    {detalleEscandallo.elaboracion?.trim() || "Sin instrucciones de elaboración registradas."}
                  </div>
                </section>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50"
                  onClick={cerrarDetalle}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--color-brand-500)] px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-red-200/50 transition hover:bg-[var(--color-brand-600)]"
                  onClick={() => {
                    cerrarDetalle();
                    abrirEditarReceta(detalleEscandallo);
                  }}
                >
                  <Pencil strokeWidth={1.5} size={14} className="mr-2" />
                  Editar receta
                </button>
              </div>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex min-h-[100dvh] w-full items-start justify-center px-4 py-6">
              <motion.div
                className="relative w-full max-w-[860px] rounded-2xl bg-[var(--color-bg-surface)] shadow-[0_25px_50px_rgba(0,0,0,0.25)] ring-1 ring-white/10 max-h-[calc(100dvh-3rem)] flex flex-col min-h-0"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-b-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-5 py-4">
                  <h2 className="m-0 text-[1.15rem] font-bold text-[var(--color-text-strong)]">
                    {modoLectura
                      ? "Ver Receta"
                      : editEscandalloId
                        ? "Editar Receta"
                        : "Nueva Receta"}
                  </h2>

                  <button
                    type="button"
                    className="no-global-button flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[#50596D] shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-brand-500)] active:scale-95"
                    aria-label="Cerrar ventana"
                    onClick={cerrarModal}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable]">
                  <form onSubmit={guardarEscandallo}>
              <div className="grid grid-cols-2 gap-4 mb-5 max-[768px]:grid-cols-1">
                <div className="flex flex-col gap-2 mb-4">
                  <label htmlFor="nombrePlato" className="text-[13px] font-semibold text-[var(--color-text-muted)] flex items-center gap-2">
                    <i className="fa-solid fa-utensils"></i>
                    Nombre del Plato
                  </label>
                  <input
                    type="text"
                    id="nombrePlato"
                    required
                    className="w-full px-4 py-3 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none disabled:opacity-70"
                    placeholder="Ej: Tortilla Española"
                    value={nombrePlato}
                    disabled={modoLectura}
                    onChange={(e) => setNombrePlato(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <label htmlFor="pvpPlato" className="text-[13px] font-semibold text-[var(--color-text-muted)] flex items-center gap-2">
                    <i className="fa-solid fa-euro-sign"></i>
                    Precio Venta (PVP)
                  </label>
                  <input
                    type="number"
                    id="pvpPlato"
                    step="0.01"
                    className="w-full px-4 py-3 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none disabled:opacity-70"
                    value={pvpPlato}
                    disabled={modoLectura}
                    onChange={(e) => setPvpPlato(e.target.value)}
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-2 mb-1 max-[768px]:col-span-1">
                  <label htmlFor="elaboracionPlato" className="text-[13px] font-semibold text-[var(--color-text-muted)] flex items-center gap-2">
                    <i className="fa-solid fa-list-ol"></i>
                    Pasos de Elaboración
                  </label>
                  <textarea
                    id="elaboracionPlato"
                    rows={4}
                    className="w-full px-4 py-3 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none disabled:opacity-70 resize-y min-h-[100px]"
                    placeholder="Describe los pasos para preparar la receta..."
                    value={elaboracionPlato}
                    disabled={modoLectura}
                    onChange={(e) => setElaboracionPlato(e.target.value)}
                  />
                </div>
              </div>

              <div className="border border-[var(--color-border-default)] p-6 rounded-xl mb-7 bg-[var(--color-bg-soft)]">
                <h3 className="m-0 mb-5 text-[1.1rem] text-[var(--color-text-strong)] flex items-center gap-2.5">
                  <i className="fa-solid fa-basket-shopping"></i>
                  Ingredientes
                </h3>

                {!modoLectura && (
                  <div className="grid grid-cols-[1fr_120px_auto] items-end gap-3 mb-5 max-[768px]:grid-cols-1 max-[768px]:items-stretch">
                    <div className="flex-1 flex flex-col gap-2">
                      <label
                        htmlFor="busquedaProductoIngrediente"
                        className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide"
                      >
                        Producto
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="busquedaProductoIngrediente"
                          className="w-full px-4 py-3 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
                          placeholder="Escribe al menos 2 letras..."
                          value={busquedaProductoIngrediente}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setBusquedaProductoIngrediente(nextValue);
                            setMostrarSugerenciasIngrediente(true);
                            if (productoIngredienteSeleccionado?.nombre !== nextValue) {
                              setProductoIngredienteId("");
                            }
                          }}
                          onFocus={() => {
                            if (busquedaProductoIngrediente.trim().length >= 2) {
                              setMostrarSugerenciasIngrediente(true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && productosSugeridos.length === 1) {
                              e.preventDefault();
                              seleccionarIngrediente(productosSugeridos[0]);
                            }
                          }}
                        />

                        {productoIngredienteSeleccionado && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              Seleccionado
                            </span>
                            <span>
                              {productoIngredienteSeleccionado.nombre} ({Number(productoIngredienteSeleccionado.precio).toFixed(2)} €)
                            </span>
                          </div>
                        )}

                        {mostrarSugerenciasIngrediente && productosSugeridos.length > 0 && (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                            {productosSugeridos.map((producto) => (
                              <button
                                key={String(producto.id)}
                                type="button"
                                className="no-global-button flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-slate-50"
                                onClick={() => seleccionarIngrediente(producto)}
                              >
                                <span className="min-w-0 pr-3">
                                  <span className="block truncate text-sm font-bold text-slate-700">
                                    {producto.nombre}
                                  </span>
                                  <span className="block text-xs text-slate-400">
                                    ID {producto.id}
                                  </span>
                                </span>
                                <span className="text-sm font-black text-[var(--color-brand-500)]">
                                  {Number(producto.precio).toFixed(2)} €
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {mostrarSugerenciasIngrediente && busquedaProductoIngrediente.trim().length >= 2 && productosSugeridos.length === 0 && (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-xl">
                            No se han encontrado ingredientes con ese nombre.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="cantidadIngrediente"
                        className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide"
                      >
                        Cant.
                      </label>
                      <input
                        type="number"
                        id="cantidadIngrediente"
                        step="0.1"
                        placeholder="0"
                        className="w-full px-4 py-3 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
                        value={cantidadIngrediente}
                        onChange={(e) => setCantidadIngrediente(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="invisible text-[12px] leading-none" aria-hidden="true">&nbsp;</div>
                      <button
                        type="button"
                        className="no-global-button h-[46px] px-5 rounded-lg border-0 cursor-pointer shadow-[0_4px_12px_rgba(56,161,105,0.3)] transition-[transform,filter,box-shadow] duration-150 bg-[linear-gradient(135deg,#48bb78_0%,#38a169_100%)] text-white inline-flex items-center justify-center text-[18px] font-bold hover:-translate-y-0.5 hover:brightness-105"
                        title="Añadir ingrediente"
                        onClick={agregarIngrediente}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-[24px] border border-slate-100 bg-white">
                  <Table className="min-w-[700px] bg-white">
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="rounded-l-2xl text-left">Producto</TableHead>
                        <TableHead className="text-left w-24">Cant.</TableHead>
                        <TableHead className="text-left w-24">Coste U.</TableHead>
                        <TableHead className="text-left w-[90px]">Total</TableHead>
                        <TableHead className="rounded-r-2xl text-center w-[90px] min-w-[90px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredientesReceta.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                            No hay ingredientes añadidos.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ingredientesReceta.map((ing, index) => {
                          const total = ing.cantidad * ing.precio;
                          return (
                            <TableRow key={`${ing.producto_id}-${index}`} className="bo-table-row">
                              <TableCell className="text-[var(--color-text-strong)]">{ing.nombre}</TableCell>
                              <TableCell>
                                {modoLectura ? (
                                  ing.cantidad
                                ) : (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-soft)] px-3.5 py-2.5 text-[14px] transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
                                    value={String(ing.cantidad)}
                                    onChange={(e) => actualizarCantidadIngrediente(index, e.target.value)}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-[var(--color-text-strong)]">{ing.precio.toFixed(2)} €</TableCell>
                              <TableCell className="text-[var(--color-text-strong)]">{total.toFixed(2)} €</TableCell>
                              <TableCell className="text-center">
                                {!modoLectura && (
                                  <button
                                    type="button"
                                    className="bo-table-action-btn text-red-500 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => eliminarIngrediente(index)}
                                  >
                                    <Trash2 strokeWidth={1.5} size={18} />
                                  </button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-[var(--color-bg-soft)] hover:bg-[var(--color-bg-soft)] font-bold">
                        <TableCell colSpan={3} className="text-right text-[var(--color-text-strong)]">COSTE TOTAL:</TableCell>
                        <TableCell className="text-[#c53030]">{costeTotal.toFixed(2)} €</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Coste actual
                  </span>
                  <span className="mt-2 block text-3xl font-black text-slate-800">
                    {costeTotal.toFixed(2)} €
                  </span>
                  <p className="mt-2 mb-0 text-sm text-slate-500">
                    Suma de todos los ingredientes de la receta.
                  </p>
                </article>

                <article className="rounded-3xl border border-red-100 bg-red-50/70 px-6 py-5">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-brand-500)]">
                    PVP sugerido
                  </span>
                  <span className="mt-2 block text-3xl font-black text-[var(--color-brand-500)]">
                    {pvp.toFixed(2)} €
                  </span>
                  <p className="mt-2 mb-0 text-sm text-slate-500">
                    Precio final que verá el usuario o cliente interno.
                  </p>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Rentabilidad
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className={`inline-flex rounded-full px-4 py-2 text-xl font-black ring-1 ${classMargenBadge(margenBeneficio)}`}>
                      {margenBeneficio.toFixed(1)}%
                    </span>
                    <span className="text-2xl font-black text-slate-700">
                      {beneficioNeto.toFixed(2)} €
                    </span>
                  </div>
                  <p className="mt-2 mb-0 text-sm text-slate-500">
                    Margen y beneficio neto calculados en tiempo real.
                  </p>
                </article>
              </div>

              <div className="flex justify-end gap-4 pt-5 border-t border-t-[var(--color-border-default)]">
                <button
                  type="button"
                  className="bg-[var(--color-border-default)] text-[var(--color-text-muted)] border-0 px-6 py-3 rounded-[10px] font-semibold cursor-pointer transition-colors hover:text-[var(--color-text-strong)]"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>

                {!modoLectura && (
                  <button
                    type="submit"
                    className="border-0 px-9 py-3 rounded-[10px] font-semibold cursor-pointer shadow-[0_4px_12px_rgba(56,161,105,0.3)] transition-[transform,filter,box-shadow] duration-150 bg-[linear-gradient(135deg,#48bb78_0%,#38a169_100%)] text-white hover:-translate-y-0.5 hover:brightness-105"
                  >
                    <i className="fa-solid fa-save"></i> Guardar Receta
                  </button>
                )}
              </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StaggerPage>
  );
}
