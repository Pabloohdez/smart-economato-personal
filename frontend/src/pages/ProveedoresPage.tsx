import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CalendarDays, ChevronDown, Download, Filter, Mail, MoreHorizontal, Pencil, Plus, Trash2, Upload } from "lucide-react";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Badge } from "../components/ui/badge";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";

import { showNotification, showConfirm } from "../utils/notifications";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import { deleteProveedor, getProveedoresLista, saveProveedor } from "../services/proveedoresService";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import type { Proveedor } from "../types";
import { useAuth } from "../contexts/AuthContext";
import TablePagination from "../components/ui/TablePagination";
import SearchInput from "../components/ui/SearchInput";
import BackofficeTablePanel from "../components/ui/BackofficeTablePanel";
import UiSelect from "../components/ui/UiSelect";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const paginatedBodyVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
} as const;

const paginatedRowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: "easeIn" },
  },
} as const;

function getInitials(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

export default function ProveedoresPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentRole = String(user?.role ?? user?.rol ?? "").trim().toLowerCase();
  const isAlumno = currentRole === "alumno" || currentRole === "student";

  const [modalOpen, setModalOpen] = useState(false);
  const [q, setQ] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importandoExcel, setImportandoExcel] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);

  const [form, setForm] = useState({
    id: "",
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
  });

  const proveedoresQuery = useQuery({
    queryKey: queryKeys.proveedores,
    queryFn: getProveedoresLista,
    refetchInterval: 60_000,
  });

  const saveProveedorMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number | string; payload: Omit<Proveedor, "id"> }) =>
      saveProveedor(payload, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores });
      broadcastQueryInvalidation(queryKeys.proveedores);
    },
  });

  const deleteProveedorMutation = useMutation({
    mutationFn: deleteProveedor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores });
      broadcastQueryInvalidation(queryKeys.proveedores);
    },
  });

  const proveedores = proveedoresQuery.data ?? [];
  const loading = proveedoresQuery.isLoading;
  const guardandoProveedor = saveProveedorMutation.isPending;
  const proveedoresError = proveedoresQuery.error instanceof Error ? proveedoresQuery.error.message : "";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const byEstado = proveedores.filter((p) => {
      const activo = (p as any).activo !== false;
      if (estadoFiltro === "active") return activo;
      if (estadoFiltro === "inactive") return !activo;
      return true;
    });

    if (!s) return byEstado;
    return byEstado.filter((p) => {
      return (
        String(p.nombre ?? "").toLowerCase().includes(s)
        || String(p.contacto ?? "").toLowerCase().includes(s)
        || String(p.telefono ?? "").toLowerCase().includes(s)
        || String(p.email ?? "").toLowerCase().includes(s)
      );
    });
  }, [proveedores, q, estadoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visible = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    if (proveedoresQuery.error) {
      console.error(proveedoresQuery.error);
      showNotification("Error de conexión cargando proveedores", "error");
    }
  }, [proveedoresQuery.error]);

  async function reintentarCarga() {
    await proveedoresQuery.refetch();
  }

  async function exportarExcel() {
    const XLSX = await import("xlsx");
    const rows = filtered.map((p) => ({
      Nombre: String(p.nombre ?? ""),
      Contacto: String(p.contacto ?? ""),
      Telefono: String(p.telefono ?? ""),
      Email: String(p.email ?? ""),
      Estado: (p as any).activo === false ? "Inactiva" : "Activa",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Proveedores");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proveedores-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification("Proveedores exportados a Excel.", "success");
  }

  async function importarExcel(file: File) {
    setImportandoExcel(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      let procesados = 0;
      for (const row of rows) {
        const nombre = String(row.Nombre ?? row.nombre ?? row.Proveedor ?? row.proveedor ?? row.Empresa ?? "").trim();
        if (!nombre) continue;

        await saveProveedor({
          nombre,
          contacto: String(row.Contacto ?? row.contacto ?? "").trim() || undefined,
          telefono: String(row.Telefono ?? row.telefono ?? "").trim() || undefined,
          email: normalizeOptionalEmail(String(row.Email ?? row.email ?? "")),
        });
        procesados += 1;
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores });
      broadcastQueryInvalidation(queryKeys.proveedores);
      showNotification(`Importación completada: ${procesados} proveedor(es).`, "success");
    } catch (error) {
      console.error(error);
      showNotification("No se pudo importar el Excel de proveedores.", "error");
    } finally {
      setImportandoExcel(false);
    }
  }

  function abrirModal() {
    setForm({
      id: "",
      nombre: "",
      contacto: "",
      telefono: "",
      email: "",
    });

    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
  }

  // ----------------------------
  // Guardar proveedor
  // ----------------------------

  async function guardarProveedor(e: React.FormEvent) {
    e.preventDefault();

    if (guardandoProveedor) return;

    if (!form.nombre.trim()) {
      showNotification("El nombre del proveedor es obligatorio", "warning");
      return;
    }

    if (!isValidOptionalEmail(form.email)) {
      showNotification("El email del proveedor no es válido", "warning");
      return;
    }

    const normalizedEmail = normalizeOptionalEmail(form.email);

    try {
      await saveProveedorMutation.mutateAsync({
        id: form.id || undefined,
        payload: {
          nombre: form.nombre.trim(),
          contacto: form.contacto.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          email: normalizedEmail,
        },
      });
      showNotification(
        form.id ? "Proveedor actualizado" : "Proveedor creado",
        "success",
      );
      cerrarModal();
    } catch (e) {
      console.error(e);
      showNotification("Error guardando proveedor", "error");
    }
  }

  // ----------------------------
  // Eliminar proveedor
  // ----------------------------

  async function eliminarProveedor(id: string) {
    const ok = await showConfirm(
      "¿Eliminar este proveedor?\n\nEsta acción no se puede deshacer.",
    );

    if (!ok) return;

    try {
      await deleteProveedorMutation.mutateAsync(id);
      showNotification("Proveedor eliminado", "success");
    } catch (e) {
      console.error(e);
      showNotification(e instanceof Error ? e.message : "Error eliminando proveedor", "error");
    }
  }

  // ----------------------------
  // ----------------------------
  // RENDER
  // ----------------------------

  return (
    <StaggerPage>
      <StaggerItem>
      <div className="mb-[30px] border-b-2 border-[var(--color-border-default)] pb-5 flex flex-wrap items-end justify-between gap-4 max-[900px]:items-stretch">
        <div>
          <h2 className="m-0 text-[28px] font-bold text-primary flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </span>
            Gestión de Proveedores
          </h2>
          <p className="mt-2 mb-0 text-[14px] text-[#50596D]">
            Directorio operativo de contactos, teléfonos y correos de suministro.
          </p>
        </div>

        <div className="flex items-center gap-[15px] flex-wrap max-[900px]:w-full">
          <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-sm)] text-[#50596D] font-semibold max-[900px]:w-full max-[900px]:justify-center">
            <CalendarDays className="h-4 w-4 text-[var(--color-brand-500)]" />
            <span>{hoyES()}</span>
          </div>
        </div>
      </div>
      </StaggerItem>

      {proveedoresError && (
        <StaggerItem>
          <div className="mb-4 flex flex-col gap-4">
            <Alert type="error" title="Error al cargar proveedores">{proveedoresError}</Alert>
            <div>
              <Button type="button" variant="secondary" onClick={reintentarCarga}>
                Reintentar carga
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      {/* Toolbar separado (como Inventario) */}
      <StaggerItem>
        <div className="rounded-[30px] border border-slate-200/90 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06),0_10px_24px_rgba(226,232,240,0.55)]">
          <div className="grid w-full grid-cols-1 gap-3 min-[1180px]:grid-cols-[minmax(340px,1.6fr)_minmax(180px,0.7fr)_minmax(220px,0.9fr)_auto]">
            <SearchInput
              value={q}
              onChange={(value) => {
                setQ(value);
                setPage(1);
              }}
              placeholder="Buscar proveedor, contacto, teléfono o email..."
              ariaLabel="Buscar proveedor"
            />

            <UiSelect
              value={estadoFiltro}
              onChange={(value) => {
                setEstadoFiltro((value as any) || "all");
                setPage(1);
              }}
              leadingIcon={<Filter className="h-4 w-4" />}
              triggerClassName="h-11 rounded-xl"
              options={[
                { value: "all", label: "Estado: Todas" },
                { value: "active", label: "Estado: Activas" },
                { value: "inactive", label: "Estado: Inactivas" },
              ]}
            />

            <DropdownMenu open={importMenuOpen} onOpenChange={setImportMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" /> Exportar / Importar</span>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${importMenuOpen ? "rotate-180" : "rotate-0"}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] p-0 rounded-xl border-slate-300"
              >
                <DropdownMenuItem onSelect={() => void exportarExcel()}>
                  <Download className="h-4 w-4" /> Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".xlsx,.xls";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (file) void importarExcel(file);
                    };
                    input.click();
                  }}
                  disabled={importandoExcel}
                >
                  <Upload className="h-4 w-4" /> {importandoExcel ? "Importando..." : "Importar Excel"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!isAlumno ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] px-5 text-[13px] font-semibold text-white shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)]"
                onClick={abrirModal}
                type="button"
              >
                <Plus className="h-4 w-4" /> Nuevo Proveedor
              </button>
            ) : null}
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
      <BackofficeTablePanel
        className="mt-3"
        header={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
              {filtered.length} proveedor(es)
            </Badge>
          </div>
        }
        footer={
          <TablePagination
            totalItems={filtered.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            label="proveedores"
          />
        }
      >
        {loading && <Spinner label="Cargando proveedores..." />}
        {!loading && (
          <>
            {/* Móvil/Tablet: lista/card (evita tabla aplastada en iPad) */}
            <div className="hidden max-[1024px]:block">
              {visible.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No hay proveedores para mostrar.</div>
              ) : (
                <div className="grid gap-3">
                  {visible.map((p) => (
                    <div
                      key={`prov-m-${String(p.id)}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${getAvatarColor(p.nombre)}`}
                          >
                            {getInitials(p.nombre)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-extrabold text-slate-900">{p.nombre}</div>
                            <div className="mt-0.5 text-[12px] text-slate-500">Proveedor registrado</div>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            className={`bo-table-action-btn text-blue-600 ${isAlumno ? "cursor-not-allowed opacity-45" : "hover:bg-blue-50 hover:text-blue-700"}`}
                            title={isAlumno ? "Sin permisos para editar" : "Editar"}
                            onClick={
                              isAlumno
                                ? undefined
                                : () => {
                                    setForm({
                                      id: String(p.id),
                                      nombre: p.nombre,
                                      contacto: p.contacto || "",
                                      telefono: p.telefono || "",
                                      email: p.email || "",
                                    });
                                    setModalOpen(true);
                                  }
                            }
                            disabled={isAlumno}
                            aria-disabled={isAlumno}
                          >
                            <Pencil className="h-[18px] w-[18px]" strokeWidth={1.5} />
                          </button>

                          <button
                            type="button"
                            className={`bo-table-action-btn text-slate-500 ${isAlumno ? "cursor-not-allowed opacity-45" : "transition-colors hover:text-red-600"}`}
                            aria-label="Eliminar proveedor"
                            title={isAlumno ? "Sin permisos para eliminar" : "Eliminar proveedor"}
                            onClick={isAlumno ? undefined : () => eliminarProveedor(String(p.id))}
                            disabled={isAlumno}
                            aria-disabled={isAlumno}
                          >
                            <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-[13px] text-slate-700">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500">Contacto</span>
                          <span className="font-semibold text-slate-800 truncate">{p.contacto || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500">Teléfono</span>
                          <span className="font-semibold text-slate-800 truncate">{p.telefono || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500">Email</span>
                          <span className="font-semibold text-slate-800 truncate">{p.email || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: tabla */}
            <div className="w-full overflow-x-auto max-[1024px]:hidden">
              <Table className="min-w-[980px] overflow-hidden rounded-[24px] border border-slate-100 bg-white">
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="rounded-l-2xl whitespace-nowrap min-w-[260px]">Proveedor</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[200px]">Contacto</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[150px]">Teléfono</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[220px]">Email</TableHead>
                    <TableHead className="rounded-r-2xl whitespace-nowrap text-right min-w-[140px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.tbody
                    key={`proveedores-page-${safePage}-${pageSize}`}
                    variants={paginatedBodyVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {visible.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                          No hay proveedores para mostrar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visible.map((p) => (
                      <motion.tr key={String(p.id)} variants={paginatedRowVariants} className="bo-table-row">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${getAvatarColor(p.nombre)}`}>
                              {getInitials(p.nombre)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">{p.nombre}</div>
                              <div className="mt-0.5 text-[12px] text-slate-500">Proveedor registrado</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{p.contacto || "-"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{p.telefono || "-"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{p.email || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              className={`bo-table-action-btn text-blue-600 ${isAlumno ? "cursor-not-allowed opacity-45" : "hover:bg-blue-50 hover:text-blue-700"}`}
                              title={isAlumno ? "Sin permisos para editar" : "Editar"}
                              onClick={
                                isAlumno
                                  ? undefined
                                  : () => {
                                      setForm({
                                        id: String(p.id),
                                        nombre: p.nombre,
                                        contacto: p.contacto || "",
                                        telefono: p.telefono || "",
                                        email: p.email || "",
                                      });
                                      setModalOpen(true);
                                    }
                              }
                              disabled={isAlumno}
                              aria-disabled={isAlumno}
                            >
                              <Pencil className="h-[18px] w-[18px]" strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              className={`bo-table-action-btn text-slate-500 ${isAlumno ? "cursor-not-allowed opacity-45" : "transition-colors hover:text-red-600"}`}
                              aria-label="Eliminar proveedor"
                              title={isAlumno ? "Sin permisos para eliminar" : "Eliminar proveedor"}
                              onClick={isAlumno ? undefined : () => eliminarProveedor(String(p.id))}
                              disabled={isAlumno}
                              aria-disabled={isAlumno}
                            >
                              <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
                            </button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                  </motion.tbody>
                </AnimatePresence>
              </Table>
            </div>
          </>
        )}
      </BackofficeTablePanel>

      <AnimatePresence>
      {modalOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-[4px] flex items-center justify-center z-[2000] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="relative w-[90%] max-w-[520px] rounded-[28px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[30px] shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <button
              type="button"
              className="absolute top-3.5 right-3.5 w-[42px] h-[42px] rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] inline-flex items-center justify-center text-[#50596D] shadow-[var(--shadow-sm)] hover:text-[var(--color-brand-500)] hover:bg-[var(--color-bg-soft)]"
              onClick={cerrarModal}
              aria-label="Cerrar"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            <h2 className="m-0 mb-5 text-[20px] font-bold text-[var(--color-text-strong)]">
              {form.id ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>

            <form onSubmit={guardarProveedor} className="grid gap-5">
              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[#50596D] text-[14px]">Nombre Empresa</label>
                <Input
                  className="h-12 rounded-xl"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[#50596D] text-[14px]">Persona de Contacto</label>
                <Input
                  className="h-12 rounded-xl"
                  value={form.contacto}
                  onChange={(e) =>
                    setForm({ ...form, contacto: e.target.value })
                  }
                />
              </div>

              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[#50596D] text-[14px]">Teléfono</label>
                <Input
                  className="h-12 rounded-xl"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{9}"
                  maxLength={9}
                  placeholder="9 dígitos"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value.replace(/\D/g, "").slice(0, 9) })
                  }
                />
              </div>

              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[#50596D] text-[14px]">Email</label>
                <Input
                  type="email"
                  className="h-12 rounded-xl"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={cerrarModal}>
                  Cancelar
                </Button>
                <Button type="submit" loading={guardandoProveedor}>
                  Guardar Proveedor
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      </StaggerItem>
    </StaggerPage>
  );
}
