import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, ChevronDown, Download, Filter, Plus, Upload } from "lucide-react";
import type { PedidoHistorial } from "../../types";
import SearchInput from "../ui/SearchInput";
import TablePagination from "../ui/TablePagination";
import BackofficeTablePanel from "../ui/BackofficeTablePanel";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import UiSelect from "../ui/UiSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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

type Props = {
  pedidos: PedidoHistorial[];
  onIrARecepcion: (id: number | string) => void;
  estadoFiltro?: string;
  onEstadoFiltroChange?: (v: string) => void;
  estadosUnicos?: string[];
  onNuevoPedido?: () => void;
  onExportar?: () => void;
  onImportar?: (file: File) => void;
  importando?: boolean;
};

export default function PedidosGrid({
  pedidos,
  onIrARecepcion,
  estadoFiltro = "",
  onEstadoFiltroChange,
  estadosUnicos = [],
  onNuevoPedido,
  onExportar,
  onImportar,
  importando = false,
}: Props) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importMenuOpen, setImportMenuOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const byEstado = estadoFiltro
      ? pedidos.filter((p) => String(p.estado ?? "").toUpperCase() === estadoFiltro.toUpperCase())
      : pedidos;
    if (!s) return byEstado;
    return byEstado.filter((p) => {
      return (
        String(p.id).toLowerCase().includes(s)
        || String(p.proveedor_nombre ?? "").toLowerCase().includes(s)
        || String(p.estado ?? "").toLowerCase().includes(s)
      );
    });
  }, [pedidos, q, estadoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visible = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const pendientes = filtered.filter((p) => {
    const estado = String(p.estado ?? "").toUpperCase();
    return estado === "PENDIENTE" || estado === "INCOMPLETO";
  }).length;

  return (
    <div className="space-y-3">
      {/* Toolbar separado (como Inventario) */}
      <div className="rounded-[30px] border border-slate-200/90 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06),0_10px_24px_rgba(226,232,240,0.55)]">
        <div className="grid w-full grid-cols-1 gap-3 min-[1100px]:grid-cols-[minmax(280px,1.6fr)_minmax(180px,0.7fr)_minmax(200px,0.8fr)_auto]">
          <SearchInput
            value={q}
            onChange={(value) => {
              setQ(value);
              setPage(1);
            }}
            placeholder="Buscar por ID, proveedor o estado..."
            ariaLabel="Buscar pedidos"
          />

          <UiSelect
            value={estadoFiltro}
            onChange={(v) => {
              onEstadoFiltroChange?.(v);
              setPage(1);
            }}
            leadingIcon={<Filter className="h-4 w-4" />}
            triggerClassName="h-11 rounded-xl"
            options={[
              { value: "", label: "Estado: Todos" },
              ...estadosUnicos.map((s) => ({ value: s, label: s })),
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
              <DropdownMenuItem onSelect={() => onExportar?.()}>
                <Download className="h-4 w-4" /> Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".xlsx,.xls";
                  input.onchange = () => {
                    const file = input.files?.[0];
                    if (file) onImportar?.(file);
                  };
                  input.click();
                }}
                disabled={importando}
              >
                <Upload className="h-4 w-4" /> {importando ? "Importando..." : "Importar Excel"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] px-5 text-[13px] font-semibold text-white shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] whitespace-nowrap"
            onClick={() => onNuevoPedido?.()}
          >
            <Plus className="h-4 w-4" /> Nuevo Pedido
          </button>
        </div>
      </div>

      <BackofficeTablePanel
        header={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="outline" className="border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {filtered.length} pedido(s)
              </Badge>
              <Badge variant="warning" className="px-3 py-1 text-[11px] font-semibold">
                {pendientes} pendiente(s)
              </Badge>
            </div>
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
            label="pedidos"
          />
        }
      >

      {/* Móvil: cards */}
      <div className="hidden max-[640px]:block">
        {visible.length === 0 ? (
          <div className="py-8 text-center text-slate-500">No hay pedidos que coincidan.</div>
        ) : (
          <div className="grid gap-3">
            {visible.map((p) => {
              const estado = String(p.estado ?? "").toUpperCase();
              const canReceive = estado === "PENDIENTE" || estado === "INCOMPLETO";
              const total = Number(p.total ?? 0);
              return (
                <div
                  key={`pedido-m-${String(p.id)}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Pedido #{p.id}
                      </div>
                      <div className="mt-1 flex items-center gap-2 min-w-0">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 shrink-0">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-extrabold text-slate-900">
                            {p.proveedor_nombre || "Proveedor"}
                          </div>
                          <div className="mt-0.5 text-[12px] text-slate-500">
                            Total: <span className="font-semibold text-slate-800">{total.toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={
                        estado === "COMPLETADO"
                          ? "success"
                          : estado === "PENDIENTE" || estado === "INCOMPLETO"
                            ? "warning"
                            : "outline"
                      }
                      className="px-3 py-1 text-[11px] font-semibold shrink-0"
                    >
                      {p.estado}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    {canReceive ? (
                      <button
                        type="button"
                        className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-all duration-150 hover:brightness-95"
                        onClick={() => onIrARecepcion(p.id)}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Ir a Recepción
                      </button>
                    ) : (
                      <div className="w-full rounded-xl bg-slate-50 px-4 py-3 text-center text-[12px] font-semibold text-slate-600">
                        Completado
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tablet/Desktop: tabla */}
      <div className="w-full overflow-x-auto max-[640px]:hidden">
        <Table className="min-w-[760px] overflow-hidden rounded-[24px] border border-slate-100 bg-white">
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="rounded-l-2xl">ID</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="rounded-r-2xl">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <AnimatePresence mode="wait" initial={false}>
            <motion.tbody
              key={`pedidos-page-${safePage}-${pageSize}`}
              variants={paginatedBodyVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    No hay pedidos que coincidan.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((p) => {
                  const estado = String(p.estado ?? "").toUpperCase();
                  const canReceive = estado === "PENDIENTE" || estado === "INCOMPLETO";
                  return (
                    <motion.tr
                      key={String(p.id)}
                      variants={paginatedRowVariants}
                      className="bo-table-row"
                    >
                      <TableCell className="text-sm font-medium text-slate-900">{p.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{p.proveedor_nombre}</div>
                            <div className="mt-0.5 text-[12px] text-slate-500">Pedido #{p.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            estado === "COMPLETADO"
                              ? "success"
                              : estado === "PENDIENTE" || estado === "INCOMPLETO"
                                ? "warning"
                                : "outline"
                          }
                          className="px-3 py-1 text-[11px] font-semibold"
                        >
                          {p.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-slate-900">{Number(p.total ?? 0).toFixed(2)} €</TableCell>
                      <TableCell>
                        {canReceive ? (
                          <button
                            type="button"
                            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:brightness-95"
                            onClick={() => onIrARecepcion(p.id)}
                          >
                            <ArrowRight className="h-4 w-4" />
                            Ir a Recepción
                          </button>
                        ) : (
                          <span className="inline-block rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                            Completado
                          </span>
                        )}
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </motion.tbody>
          </AnimatePresence>
        </Table>
      </div>
      </BackofficeTablePanel>
    </div>
  );
}
