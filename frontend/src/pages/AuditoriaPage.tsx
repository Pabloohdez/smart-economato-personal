import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiFetch, type ApiRequestError } from "../services/apiClient";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import type { UsuarioActivo } from "../types";
import { useAuth } from "../contexts/AuthContext";
import UiSelect from "../components/ui/UiSelect";
import SearchInput from "../components/ui/SearchInput";
import TablePagination from "../components/ui/TablePagination";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import BackofficeTablePanel from "../components/ui/BackofficeTablePanel";
import Button from "../components/ui/Button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ClipboardList, Eye } from "lucide-react";

type RegistroAuditoria = {
  id: number | string;
  fecha: string;
  usuario_id?: string | number;
  usuario_nombre?: string;
  accion: string;
  entidad?: string;
  entidad_id?: string | number;
  detalles?: Record<string, any>;
};

type FiltrosAuditoria = {
  accion: string;
  usuario: string;
  fechaDesde: string;
  fechaHasta: string;
};

function formatFechaCorta(fechaStr: string) {
  const d = new Date(String(fechaStr ?? ""));
  if (Number.isNaN(d.getTime())) return { fecha: String(fechaStr ?? ""), hora: "" };
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
}

export default function AuditoriaPage() {
  const { user: authUser } = useAuth();

  const [registrosAuditoria, setRegistrosAuditoria] = useState<
    RegistroAuditoria[]
  >([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<string[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filtros, setFiltros] = useState<FiltrosAuditoria>({
    accion: "",
    usuario: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] =
    useState<RegistroAuditoria | null>(null);

  const [accesoDenegado, setAccesoDenegado] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!esAdminOProfesor(authUser)) {
      setAccesoDenegado(true);
      setLoading(false);
      return;
    }

    void cargarAuditoria();
  }, []);

  const accionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    registrosAuditoria.forEach((r) => set.add(String(r.accion ?? "")));
    return Array.from(set).filter(Boolean).sort();
  }, [registrosAuditoria]);

  const usuariosOpts = useMemo(() => {
    return usuariosDisponibles.slice().sort().map((u) => ({ value: u, label: u }));
  }, [usuariosDisponibles]);

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    return registrosAuditoria.filter((r) => {
      if (filtros.accion && String(r.accion) !== filtros.accion) return false;
      if (filtros.usuario && String(r.usuario_nombre ?? r.usuario_id ?? "") !== filtros.usuario) return false;
      if (filtros.fechaDesde) {
        if (new Date(r.fecha) < new Date(filtros.fechaDesde)) return false;
      }
      if (filtros.fechaHasta) {
        const hasta = new Date(filtros.fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        if (new Date(r.fecha) > hasta) return false;
      }
      if (!s) return true;
      return (
        String(r.id).toLowerCase().includes(s)
        || String(r.usuario_nombre ?? r.usuario_id ?? "").toLowerCase().includes(s)
        || String(r.accion ?? "").toLowerCase().includes(s)
        || String(r.entidad ?? "").toLowerCase().includes(s)
      );
    });
  }, [registrosAuditoria, filtros, q]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const visible = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtrados.slice(start, start + pageSize);
  }, [filtrados, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [q, filtros.accion, filtros.usuario, filtros.fechaDesde, filtros.fechaHasta]);

  async function cargarAuditoria(filtrosAplicados?: Partial<FiltrosAuditoria>) {
    try {
      setLoading(true);
      setErrorMsg("");

      const params = new URLSearchParams();
      const f = { ...filtros, ...filtrosAplicados };

      if (f.accion) params.append("accion", f.accion);
      if (f.usuario) params.append("usuario", f.usuario);
      if (f.fechaDesde) params.append("fecha_desde", f.fechaDesde);
      if (f.fechaHasta) params.append("fecha_hasta", f.fechaHasta);

      params.append("limite", "200");

      const url = `/auditoria?${params.toString()}`;
      const result = await apiFetch<any>(url, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const data = result.data || result;

      if (data.registros) {
        const registros = Array.isArray(data.registros) ? data.registros : [];
        setRegistrosAuditoria(registros);
        setTotalRegistros(Number(data.total ?? registros.length));

        const usuarios: string[] = Array.from(
          new Set<string>(
            registros
              .map((r: RegistroAuditoria) =>
                String(r.usuario_nombre || r.usuario_id || "").trim(),
              )
              .filter((u: string) => u.length > 0),
          ),
        ).sort((a, b) => a.localeCompare(b));

        setUsuariosDisponibles(usuarios);
      } else if (result.error) {
        setErrorMsg(
          result.error.message || result.error || "Error al cargar auditoría",
        );
      } else {
        setErrorMsg("Error al cargar auditoría");
      }
    } catch (error) {
      console.error("Error al cargar auditoría:", error);
      const apiError = error as ApiRequestError;

      if (apiError.status === 403) {
        const payload =
          typeof apiError.payload === "object" && apiError.payload !== null
            ? (apiError.payload as { error?: string })
            : undefined;
        setAccesoDenegado(true);
        setErrorMsg(payload?.error || apiError.message || "Se requieren permisos de administrador o profesor");
      } else {
        setErrorMsg("Error de conexión");
      }
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros() {
    void cargarAuditoria();
  }

  function limpiarFiltros() {
    const vacios = {
      accion: "",
      usuario: "",
      fechaDesde: "",
      fechaHasta: "",
    };
    setFiltros(vacios);
    void cargarAuditoria(vacios);
  }

  function abrirModal(registro: RegistroAuditoria) {
    setRegistroSeleccionado(registro);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setRegistroSeleccionado(null);
  }

  function getAccionBadge(accion: string) {
    const badges: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline"; texto: string }> = {
      MOVIMIENTO: { variant: "secondary", texto: "Movimiento" },
      PEDIDO: { variant: "outline", texto: "Pedido" },
      BAJA: { variant: "destructive", texto: "Baja" },
      CREAR_PRODUCTO: { variant: "success", texto: "Crear Producto" },
      MODIFICAR_PRODUCTO: { variant: "warning", texto: "Modificar Producto" },
      ELIMINAR_PRODUCTO: { variant: "destructive", texto: "Eliminar Producto" },
    };
    return (
      badges[accion] ?? {
        variant: "outline",
        texto: accion,
      }
    );
  }

  const resumen = useMemo(() => {
    const usuariosUnicos = new Set(
      registrosAuditoria.map((r) => r.usuario_nombre || r.usuario_id || ""),
    ).size;

    let rangoFechas = "Sin datos";
    if (registrosAuditoria.length > 0) {
      const fechas = registrosAuditoria
        .map((r) => new Date(r.fecha))
        .filter((d) => !Number.isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      if (fechas.length > 0) {
        const opts: Intl.DateTimeFormatOptions = {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        };
        const desde = fechas[0].toLocaleDateString("es-ES", opts);
        const hasta = fechas[fechas.length - 1].toLocaleDateString(
          "es-ES",
          opts,
        );
        rangoFechas = desde === hasta ? desde : `${desde} — ${hasta}`;
      }
    }

    return {
      total: totalRegistros,
      usuariosUnicos,
      rangoFechas,
    };
  }, [registrosAuditoria, totalRegistros]);

  if (accesoDenegado) {
    return (
      <div>
        <div className="mb-[28px] pb-5 border-b-2 border-[var(--color-border-default)]">
          <h1 className="text-[28px] font-bold text-primary m-0 mb-2 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm"><ClipboardList className="h-5 w-5" /></span> REGISTRO DE AUDITORÍA
          </h1>
          <p className="text-[14px] text-[var(--color-text-muted)] m-0">
            Historial completo de actividades del sistema
          </p>
        </div>

        <div className="bg-[var(--color-bg-surface)] p-6 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] border border-[var(--color-border-default)]">
          <Alert type="error" title="Acceso denegado">
            {errorMsg || "Se requieren permisos de administrador"}
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <StaggerPage className="w-full">
      <StaggerItem className="mb-[28px] pb-5 border-b-2 border-[var(--color-border-default)]">
        <h1 className="text-[28px] font-bold text-primary m-0 mb-2 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm"><ClipboardList className="h-5 w-5" /></span> Registro de Auditoría
        </h1>
        <p className="text-[14px] text-[var(--color-text-muted)] m-0">
          Historial completo de actividades del sistema
        </p>
      </StaggerItem>

      <StaggerItem className="mb-6 rounded-[30px] border border-slate-200/90 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap gap-5 items-end">
          <div className="flex flex-col gap-2 flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <label htmlFor="filtroAccion" className="font-semibold text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
              <i className="fa-solid fa-filter"></i> Tipo de Acción
            </label>
            <UiSelect
              id="filtroAccion"
              value={filtros.accion}
              onChange={(v) => setFiltros((prev) => ({ ...prev, accion: v }))}
              placeholder="Todas las acciones"
              options={[
                { value: "", label: "Todas las acciones" },
                { value: "MOVIMIENTO", label: "Movimientos de Stock" },
                { value: "PEDIDO", label: "Pedidos" },
                { value: "BAJA", label: "Bajas de Producto" },
                { value: "CREAR_PRODUCTO", label: "Crear Producto" },
                { value: "MODIFICAR_PRODUCTO", label: "Modificar Producto" },
                { value: "ELIMINAR_PRODUCTO", label: "Eliminar Producto" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <label htmlFor="filtroUsuario" className="font-semibold text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
              <i className="fa-solid fa-user"></i> Usuario
            </label>
            <UiSelect
              id="filtroUsuario"
              value={filtros.usuario}
              onChange={(v) => setFiltros((prev) => ({ ...prev, usuario: v }))}
              placeholder="Todos los usuarios"
              options={[
                { value: "", label: "Todos los usuarios" },
                ...usuariosOpts,
              ]}
            />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <label htmlFor="filtroFechaDesde" className="font-semibold text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
              <i className="fa-solid fa-calendar"></i> Desde
            </label>
            <Input
              type="date"
              id="filtroFechaDesde"
              className="h-12 rounded-xl"
              value={filtros.fechaDesde}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <label htmlFor="filtroFechaHasta" className="font-semibold text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
              <i className="fa-solid fa-calendar"></i> Hasta
            </label>
            <Input
              type="date"
              id="filtroFechaHasta"
              className="h-12 rounded-xl"
              value={filtros.fechaHasta}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 items-stretch flex-wrap self-end max-[768px]:w-full max-[768px]:flex-col">
            <Button
              type="button"
              id="btnAplicarFiltros"
              className="h-12"
              onClick={aplicarFiltros}
            >
              <i className="fa-solid fa-filter"></i> Aplicar
            </Button>
            <Button
              type="button"
              id="btnLimpiarFiltros"
              variant="secondary"
              className="h-12"
              onClick={limpiarFiltros}
            >
              <i className="fa-solid fa-eraser"></i> Limpiar
            </Button>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        {loading && <Spinner label="Cargando auditoría..." />}
        {!loading && errorMsg && (
          <Alert type="error" title="Error al cargar">{errorMsg}</Alert>
        )}
        {!loading && !errorMsg && (
          <BackofficeTablePanel
            header={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {filtrados.length} registro(s) visibles
                  </Badge>
                  {totalRegistros > filtrados.length ? (
                    <Badge variant="outline" className="border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                      Total remoto: {totalRegistros}
                    </Badge>
                  ) : null}
                </div>
                <div className="w-full max-w-[380px]">
                  <SearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Buscar por usuario, acción o entidad..."
                    ariaLabel="Buscar en auditoría"
                  />
                </div>
              </div>
            }
            footer={
              <TablePagination
                totalItems={filtrados.length}
                page={pageSafe}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={() => {}}
                pageSizeOptions={[pageSize]}
                label="registros"
              />
            }
          >
            {/* Móvil: cards (evita solapes y scroll lateral) */}
            <div className="hidden max-[640px]:block">
              {visible.length === 0 ? (
                <div className="py-6 text-center text-slate-500">No hay registros.</div>
              ) : (
                <div className="grid gap-3">
                  {visible.map((reg) => {
                    const badge = getAccionBadge(reg.accion);
                    const f = formatFechaCorta(reg.fecha);
                    const usuario = String(reg.usuario_nombre || reg.usuario_id || "—");
                    return (
                      <div
                        key={`aud-m-${String(reg.id)}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[12px] text-slate-500">
                              {f.fecha}{f.hora ? ` · ${f.hora}` : ""}
                            </div>
                            <div className="mt-1 truncate text-[14px] font-extrabold text-slate-900">{usuario}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant={badge.variant} className="px-3 py-1 text-[11px] font-semibold">
                                {badge.texto}
                              </Badge>
                              <span className="truncate text-[12px] font-semibold text-slate-700">{reg.entidad || "—"}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="bo-table-action-btn text-slate-500"
                            onClick={() => abrirModal(reg)}
                            title="Ver detalle"
                            aria-label="Ver detalle"
                          >
                            <Eye strokeWidth={1.5} size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tablet/Desktop: tabla */}
            <div className="w-full overflow-x-auto max-[640px]:hidden">
              <Table className="min-w-[920px] overflow-hidden rounded-[24px] border border-slate-100 bg-white">
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="rounded-l-2xl whitespace-nowrap min-w-[140px]">Fecha/Hora</TableHead>
                    <TableHead className="min-w-[180px]">Usuario</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[130px]">Acción</TableHead>
                    <TableHead className="min-w-[140px]">Entidad</TableHead>
                    <TableHead className="rounded-r-2xl text-right whitespace-nowrap w-[88px]">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                        No hay registros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((reg) => {
                      const badge = getAccionBadge(reg.accion);
                      const f = formatFechaCorta(reg.fecha);
                      return (
                        <TableRow key={String(reg.id)} className="bo-table-row">
                          <TableCell className="whitespace-nowrap text-sm font-medium text-slate-900">
                            <div>{f.fecha}</div>
                            {f.hora ? <div className="text-xs text-slate-400">{f.hora}</div> : null}
                          </TableCell>
                          <TableCell className="text-sm text-slate-700">{reg.usuario_nombre || reg.usuario_id || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={badge.variant} className="px-3 py-1 text-[11px] font-semibold">
                              {badge.texto}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-700">{reg.entidad || "—"}</TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              className="bo-table-action-btn text-slate-500"
                              onClick={() => abrirModal(reg)}
                              title="Ver detalle"
                              aria-label="Ver detalle"
                            >
                              <Eye strokeWidth={1.5} size={18} />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </BackofficeTablePanel>
        )}
      </StaggerItem>

      <AnimatePresence>
        {modalOpen && registroSeleccionado && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
            onClick={(e) => e.target === e.currentTarget && cerrarModal()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="bg-[var(--color-bg-surface)] rounded-[var(--radius-md)] w-[90%] max-w-[600px] max-h-[80vh] overflow-hidden shadow-[var(--shadow-lg)]"
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
            <div className="px-6 py-5 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white flex justify-between items-center">
              <h3 className="m-0 text-[18px] flex items-center gap-3">
                <i className="fa-solid fa-info-circle"></i> Detalles de la
                Acción
              </h3>
              <button
                type="button"
                className="bg-white/20 border-0 text-white w-8 h-8 rounded-full cursor-pointer transition-transform duration-200 inline-flex items-center justify-center hover:bg-white/30 hover:rotate-90"
                onClick={cerrarModal}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="p-6 max-h-[calc(80vh-80px)] overflow-y-auto">
              <div className="mb-5">
                <div className="text-[13px] font-bold text-[var(--color-brand-500)] uppercase tracking-wide mb-3 pb-2 border-b-2 border-b-[var(--color-brand-100)] flex items-center gap-2">
                  <i className="fa-solid fa-circle-info"></i> Información
                  General
                </div>
                <div className="grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
                  {crearItemDetalleReact(
                    "Registro",
                    `#${registroSeleccionado.id}`,
                  )}
                  {crearItemDetalleReact(
                    "Fecha y Hora",
                    formatearFecha(registroSeleccionado.fecha),
                  )}
                  {crearItemDetalleReact(
                    "Usuario",
                    String(
                      registroSeleccionado.usuario_nombre ||
                        registroSeleccionado.usuario_id ||
                        "—",
                    ),
                  )}
                  {crearItemDetalleReact(
                    "Acción",
                    obtenerTextoAccion(registroSeleccionado.accion),
                  )}
                </div>
              </div>

              {registroSeleccionado.detalles &&
                Object.keys(registroSeleccionado.detalles).length > 0 && (
                  <div className="mb-5">
                    <div className="text-[13px] font-bold text-[var(--color-brand-500)] uppercase tracking-wide mb-3 pb-2 border-b-2 border-b-[var(--color-brand-100)] flex items-center gap-2">
                      <i
                        className={`fa-solid ${obtenerIconoAccion(registroSeleccionado.accion)}`}
                      ></i>
                      Datos de la Operación
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
                      {renderDetallesOperacion(registroSeleccionado)}
                    </div>
                  </div>
                )}

              {registroSeleccionado.entidad && (
                <div className="mt-4 px-4 py-3 bg-[var(--color-bg-soft)] rounded-[var(--radius-sm)] text-[13px] text-[var(--color-text-muted)] flex items-center gap-2">
                  <i className="fa-solid fa-tag"></i>
                  <span>
                    Entidad afectada:{" "}
                    <strong>
                      {registroSeleccionado.entidad_id
                        ? `${capitalizar(registroSeleccionado.entidad)} #${registroSeleccionado.entidad_id}`
                        : capitalizar(registroSeleccionado.entidad)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StaggerPage>
  );
}

function crearItemDetalleReact(label: string, valor: string) {
  return (
    <div className="px-4 py-3 bg-[var(--color-bg-soft)] rounded-[var(--radius-sm)] border-l-[3px] border-l-[var(--color-border-default)] hover:border-l-[var(--color-brand-500)] transition-[border-color] duration-150" key={`${label}-${valor}`}>
      <div className="font-bold text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest mb-0.5">{label}</div>
      <div className="text-[14px] font-medium text-[var(--color-text-strong)]">{valor}</div>
    </div>
  );
}

function renderDetallesOperacion(registro: RegistroAuditoria) {
  const detalles = registro.detalles || {};
  const items: React.ReactNode[] = [];

  if (detalles.producto) {
    items.push(crearItemDetalleReact("Producto", String(detalles.producto)));
  }

  if (detalles.cantidad !== undefined) {
    items.push(crearItemDetalleReact("Cantidad", `${detalles.cantidad} uds.`));
  }

  switch (registro.accion) {
    case "BAJA":
      if (detalles.tipo)
        items.push(
          crearItemDetalleReact("Tipo de Baja", String(detalles.tipo)),
        );
      if (detalles.motivo)
        items.push(crearItemDetalleReact("Motivo", String(detalles.motivo)));
      break;

    case "MOVIMIENTO":
      if (detalles.tipo) {
        items.push(
          crearItemDetalleReact(
            "Tipo",
            detalles.tipo === "ENTRADA"
              ? "Entrada de stock"
              : "Salida de stock",
          ),
        );
      }
      if (detalles.motivo)
        items.push(crearItemDetalleReact("Motivo", String(detalles.motivo)));
      if (
        detalles.stock_anterior !== undefined &&
        detalles.stock_nuevo !== undefined
      ) {
        items.push(
          crearItemDetalleReact(
            "Stock",
            `${detalles.stock_anterior} → ${detalles.stock_nuevo}`,
          ),
        );
      }
      break;

    case "PEDIDO":
      if (detalles.proveedor)
        items.push(
          crearItemDetalleReact("Proveedor", String(detalles.proveedor)),
        );
      if (detalles.estado)
        items.push(crearItemDetalleReact("Estado", String(detalles.estado)));
      if (detalles.motivo)
        items.push(crearItemDetalleReact("Motivo", String(detalles.motivo)));
      break;

    default:
      if (detalles.motivo)
        items.push(crearItemDetalleReact("Motivo", String(detalles.motivo)));
      if (detalles.precio) {
        items.push(
          crearItemDetalleReact(
            "Precio",
            `${parseFloat(detalles.precio).toFixed(2)} €`,
          ),
        );
      }
      if (detalles.categoria)
        items.push(
          crearItemDetalleReact("Categoría", String(detalles.categoria)),
        );
      break;
  }

  return items;
}

function formatearFecha(fechaStr: string) {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function obtenerTextoAccion(accion: string) {
  const textos: Record<string, string> = {
    MOVIMIENTO: "Movimiento de Stock",
    PEDIDO: "Pedido",
    BAJA: "Baja de Producto",
    CREAR_PRODUCTO: "Creación de Producto",
    MODIFICAR_PRODUCTO: "Modificación de Producto",
    ELIMINAR_PRODUCTO: "Eliminación de Producto",
  };
  return textos[accion] || accion;
}

function obtenerIconoAccion(accion: string) {
  const iconos: Record<string, string> = {
    MOVIMIENTO: "fa-arrows-rotate",
    PEDIDO: "fa-shopping-cart",
    BAJA: "fa-box-archive",
    CREAR_PRODUCTO: "fa-plus-circle",
    MODIFICAR_PRODUCTO: "fa-pen-to-square",
    ELIMINAR_PRODUCTO: "fa-trash-can",
  };
  return iconos[accion] || "fa-file-lines";
}

function capitalizar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function obtenerUsuarioId(usuario: UsuarioActivo | null) {
  if (!usuario) return "";
  return String(usuario.id ?? usuario.usuario ?? usuario.username ?? "");
}

function esAdminOProfesor(usuario: UsuarioActivo | null) {
  const rol = String(usuario?.rol ?? usuario?.role ?? "").toLowerCase();
  return rol === "admin" || rol === "administrador" || rol === "profesor";
}
