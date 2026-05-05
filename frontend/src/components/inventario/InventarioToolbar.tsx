import type { Categoria, Proveedor } from "../../services/productosService";
import { ArrowUpDown, Download, Filter, FilterX, MoreVertical, Plus, Search } from "lucide-react";
import { useMemo } from "react";
import ToolbarFilterDropdown from "../ui/ToolbarFilterDropdown";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

type Props = {
  q: string;
  setQ: (v: string) => void;
  cats: Categoria[];
  catId: string;
  setCatId: (v: string) => void;
  provs: Proveedor[];
  provId: string;
  setProvId: (v: string) => void;
  orden: "asc" | "desc";
  setOrden: (v: "asc" | "desc") => void;
  onlyStockBajo: boolean;
  setOnlyStockBajo: (v: boolean) => void;
  onlyProximoCaducar: boolean;
  setOnlyProximoCaducar: (v: boolean) => void;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onCreateProduct: () => void;
  limpiarFiltros: () => void;
  totalItems: number;
};

export default function InventarioToolbar({
  q,
  setQ,
  cats,
  catId,
  setCatId,
  provs,
  provId,
  setProvId,
  orden,
  setOrden,
  onlyStockBajo,
  setOnlyStockBajo,
  onlyProximoCaducar,
  setOnlyProximoCaducar,
  onExportCsv,
  onExportXlsx,
  onCreateProduct,
  limpiarFiltros,
  totalItems: _totalItems,
}: Props) {
  const stockMode = useMemo(() => {
    if (onlyStockBajo) return "stock-bajo";
    if (onlyProximoCaducar) return "proximo-caducar";
    return "todos";
  }, [onlyStockBajo, onlyProximoCaducar]);

  const hasActiveFilters = Boolean(q.trim() || catId || provId || onlyStockBajo || onlyProximoCaducar || orden !== "asc");

  function setStockMode(value: "todos" | "stock-bajo" | "proximo-caducar") {
    if (value === "todos") { setOnlyStockBajo(false); setOnlyProximoCaducar(false); return; }
    if (value === "stock-bajo") { setOnlyStockBajo(true); setOnlyProximoCaducar(false); return; }
    setOnlyStockBajo(false); setOnlyProximoCaducar(true);
  }

  const stockLabel = stockMode === "stock-bajo" ? "Bajo" : stockMode === "proximo-caducar" ? "Caduca pronto" : "Todos";
  const catLabel = cats.find((cat) => String(cat.id) === catId)?.nombre ?? "Todas";
  const provLabel = provs.find((prov) => String(prov.id) === provId)?.nombre ?? "Todos";
  const dropdownTriggerClassName = "h-12";

  return (
    <div className="mb-4">
      <div className="rounded-[30px] border border-slate-200/90 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06),0_10px_24px_rgba(226,232,240,0.55)]">
        <div className="flex w-full flex-wrap items-center gap-3">
          {/* Buscador */}
          <div className="relative min-w-[240px] flex-1 max-[520px]:min-w-0 max-[520px]:w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
            <input
              type="text"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar producto"
              className="bo-toolbar-input w-full pl-10 placeholder:text-slate-400"
            />
          </div>

          {/* Filtros */}
          <div className="min-w-[180px] flex-1 max-[520px]:min-w-0 max-[520px]:w-full">
            <ToolbarFilterDropdown
              label="Familia"
              valueLabel={catLabel}
              value={catId}
              active={Boolean(catId)}
              leadingIcon={<Filter className="h-3.5 w-3.5" strokeWidth={2} />}
              onChange={setCatId}
              options={[{ value: "", label: "Todas" }, ...cats.map((cat) => ({ value: String(cat.id), label: cat.nombre }))]}
              triggerClassName={dropdownTriggerClassName}
              searchable={false}
              menuClassName="rounded-xl border-slate-300"
            />
          </div>

          <div className="min-w-[180px] flex-1 max-[520px]:min-w-0 max-[520px]:w-full">
            <ToolbarFilterDropdown
              label="Filtrar"
              valueLabel={stockLabel}
              value={stockMode}
              active={stockMode !== "todos"}
              leadingIcon={<Filter className="h-3.5 w-3.5" strokeWidth={2} />}
              onChange={(value) => setStockMode(value as "todos" | "stock-bajo" | "proximo-caducar")}
              options={[
                { value: "todos", label: "Todos" },
                { value: "stock-bajo", label: "Stock bajo" },
                { value: "proximo-caducar", label: "Próximo a caducar" },
              ]}
              triggerClassName={dropdownTriggerClassName}
              searchable={false}
              menuClassName="rounded-xl border-slate-300"
            />
          </div>

          <div className="min-w-[200px] flex-1 max-[520px]:min-w-0 max-[520px]:w-full">
            <ToolbarFilterDropdown
              label="Proveedor"
              valueLabel={provLabel}
              value={provId}
              active={Boolean(provId)}
              leadingIcon={<Filter className="h-3.5 w-3.5" strokeWidth={2} />}
              onChange={setProvId}
              options={[{ value: "", label: "Todos" }, ...provs.map((prov) => ({ value: String(prov.id), label: prov.nombre }))]}
              triggerClassName={dropdownTriggerClassName}
              searchable={false}
              menuClassName="rounded-xl border-slate-300"
            />
          </div>

          {/* Orden + Acciones + Nuevo */}
          <button
            type="button"
            onClick={() => setOrden(orden === "asc" ? "desc" : "asc")}
            className="bo-toolbar-secondary h-12 shrink-0 justify-center gap-2 px-4 max-[520px]:w-full"
            title={orden === "asc" ? "Orden: precio ascendente (clic para invertir)" : "Orden: precio descendente (clic para invertir)"}
            aria-label="Invertir orden por precio"
          >
            <ArrowUpDown
              className={`h-4 w-4 transition-transform duration-300 ease-out ${orden !== "asc" ? "scale-110 rotate-180 text-[var(--color-brand-500)]" : "rotate-0"}`}
              strokeWidth={2}
            />
            <span className="text-[13px] font-semibold">Orden</span>
          </button>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`group bo-toolbar-secondary relative h-12 shrink-0 justify-center gap-2 px-4 max-[520px]:w-full ${hasActiveFilters ? "border-[rgba(179,49,49,0.35)] text-[var(--color-brand-500)]" : ""}`}
                aria-label="Acciones"
                title="Acciones"
              >
                <MoreVertical className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" strokeWidth={2} />
                <span className="text-[13px] font-semibold">Acciones</span>
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[var(--color-brand-500)]" aria-hidden="true" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{ width: "var(--radix-popper-anchor-width)" }}
              className="min-w-0 origin-top-right rounded-xl border-slate-300 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
            >
              <DropdownMenuItem onClick={onExportCsv}>
                <Download className="h-4 w-4" /> Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportXlsx}>
                <Download className="h-4 w-4" /> Exportar XLSX
              </DropdownMenuItem>
              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={limpiarFiltros} className="text-[#b33131] focus:text-[#b33131] focus:bg-red-50">
                    <FilterX className="h-4 w-4" strokeWidth={2} /> Limpiar Filtros
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onCreateProduct}
            className="bo-toolbar-primary-blue active:scale-[0.98] h-12 shrink-0 justify-center max-[520px]:w-full"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nuevo producto
          </button>
        </div>
      </div>
    </div>
  );
}