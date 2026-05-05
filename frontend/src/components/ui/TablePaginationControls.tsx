import { Fragment, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

type TablePaginationControlsProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  totalLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export default function TablePaginationControls({
  page,
  totalPages,
  pageSize,
  totalItems,
  totalLabel,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: TablePaginationControlsProps) {
  const pageSizeDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const safePage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (pageSizeDetailsRef.current && !pageSizeDetailsRef.current.contains(target)) {
        pageSizeDetailsRef.current.open = false;
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pageSizeDetailsRef.current) pageSizeDetailsRef.current.open = false;
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 max-[640px]:w-full max-[640px]:justify-between">
        <span className="text-sm text-gray-500 max-[640px]:w-full max-[640px]:text-left">Mostrando</span>
        <div className="relative">
          <details ref={pageSizeDetailsRef} className="group">
            <summary className="list-none flex items-center gap-1.5 rounded-md border border-black bg-white px-2.5 py-1 text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50 max-[640px]:w-[72px] max-[640px]:justify-between">
              <span className="font-medium">{pageSize}</span>
              <ChevronDown className="w-3 h-3 text-gray-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="absolute bottom-full left-0 z-30 mb-1 min-w-[64px] rounded-xl border border-black bg-white p-1 shadow-lg">
              {pageSizeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={(event) => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => {
                      onPageSizeChange(option);
                      onPageChange(1);
                    }, 380);

                    const details = event.currentTarget.closest("details") as HTMLDetailsElement | null;
                    if (details) details.open = false;
                  }}
                  className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    option === pageSize
                      ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-semibold"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </details>
        </div>
        <span className="text-sm text-gray-500 max-[640px]:w-full max-[640px]:text-left">
          de {totalItems} {totalLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1 max-[640px]:w-full max-[640px]:justify-center">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => {
              onPageChange(1);
            }, 320);
          }}
          disabled={safePage === 1}
          className="rounded-md border border-black bg-white px-2 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 max-[640px]:h-10 max-[640px]:min-w-10"
          type="button"
        >
          {"«"}
        </button>
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            onPageChange(Math.max(1, safePage - 1));
          }}
          disabled={safePage === 1}
          className="rounded-md border border-black bg-white px-2 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 max-[640px]:h-10 max-[640px]:min-w-10"
          type="button"
        >
          {"‹"}
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1)
          .filter((pageNumber) => pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - safePage) <= 2)
          .map((pageNumber, index, pages) => (
            <Fragment key={pageNumber}>
              {index > 0 && pages[index - 1] !== pageNumber - 1 ? <span className="px-2 py-1.5 text-sm text-gray-400">…</span> : null}
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  onPageChange(pageNumber);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  pageNumber === safePage
                    ? "border-[var(--brand-700)] bg-[var(--brand-600)] text-white font-semibold"
                    : "border-black bg-white text-gray-700 hover:bg-gray-50"
                } max-[640px]:h-10 max-[640px]:min-w-10`}
                type="button"
              >
                {pageNumber}
              </button>
            </Fragment>
          ))}
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            onPageChange(Math.min(totalPages, safePage + 1));
          }}
          disabled={safePage === totalPages}
          className="rounded-md border border-black bg-white px-2 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 max-[640px]:h-10 max-[640px]:min-w-10"
          type="button"
        >
          {"›"}
        </button>
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            onPageChange(totalPages);
          }}
          disabled={safePage === totalPages}
          className="rounded-md border border-black bg-white px-2 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40 max-[640px]:h-10 max-[640px]:min-w-10"
          type="button"
        >
          {"»"}
        </button>
      </div>
    </>
  );
}