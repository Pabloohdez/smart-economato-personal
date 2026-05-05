import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import UiSelect from "./UiSelect";

type Props = {
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  label?: string;
};

function scrollPageTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildPageItems(current: number, totalPages: number): Array<number | "dots"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(current);
  pages.add(Math.max(1, current - 1));
  pages.add(Math.min(totalPages, current + 1));

  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (current >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "dots"> = [];
  sorted.forEach((value, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      if (value - prev > 1) {
        items.push("dots");
      }
    }
    items.push(value);
  });

  return items;
}

export default function TablePagination({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  label = "registros",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = buildPageItems(safePage, totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === safePage) {
      return;
    }

    onPageChange(nextPage);
    scrollPageTop();
  };

  const handlePageSizeChange = (size: number) => {
    onPageSizeChange(size);
    onPageChange(1);
    scrollPageTop();
  };

  return (
    <motion.div
      className="bo-table-pagination flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-5 max-[640px]:flex-col max-[640px]:items-stretch"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-1 flex-wrap items-center gap-3 text-sm text-slate-500 max-[640px]:flex-col max-[640px]:items-stretch">
        <div className="flex items-center gap-2.5 rounded-2xl border border-[var(--color-border-default)] bg-white px-3 py-2 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Filas</span>
          <div className="w-[88px]">
            <UiSelect
              value={String(pageSize)}
              onChange={(next) => handlePageSizeChange(Number(next))}
              ariaLabel="Cantidad por página"
              triggerClassName="h-10 rounded-xl border-transparent bg-slate-50 px-3 py-2 text-sm shadow-none hover:border-[var(--color-border-default)]"
              contentClassName="rounded-2xl"
              options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
            />
          </div>
        </div>

        <div className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--color-border-default)] bg-slate-50/80 px-4 py-2 text-[13px] font-semibold text-slate-600 max-[640px]:w-full max-[640px]:justify-between">
          <span className="whitespace-nowrap">
            Mostrando {startItem}-{endItem}
          </span>
          <span className="text-slate-300 max-[640px]:hidden">|</span>
          <span className="whitespace-nowrap">
            {totalItems} {label}
          </span>
        </div>
      </div>

      <div className="inline-flex flex-wrap items-center gap-1.5 max-[640px]:w-full max-[640px]:justify-center" aria-label="Paginación de tabla">
        <button
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white text-slate-500 shadow-sm transition-[background,color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex"
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={safePage <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white text-slate-500 shadow-sm transition-[background,color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => handlePageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`pagination-items-${safePage}-${pageSize}-${totalPages}`}
            className="inline-flex items-center gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {pageItems.map((item, index) =>
              item === "dots" ? (
                <span
                  className="inline-flex h-10 w-10 items-center justify-center text-sm text-slate-400"
                  key={`dots-${index}`}
                >
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  key={item}
                  className={
                    item === safePage
                      ? "inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-[var(--color-brand-500)] px-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(179,49,49,0.24)]"
                      : "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white px-3 text-sm font-semibold text-slate-600 transition-[background,transform] duration-150 hover:bg-slate-50 active:scale-[0.98]"
                  }
                  onClick={() => handlePageChange(item)}
                  aria-current={item === safePage ? "page" : undefined}
                >
                  {item}
                </button>
              ),
            )}
          </motion.div>
        </AnimatePresence>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white text-slate-500 shadow-sm transition-[background,color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => handlePageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-white text-slate-500 shadow-sm transition-[background,color,transform] duration-150 hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex"
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={safePage >= totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

