import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";

type ToolbarFilterDropdownOption = {
  value: string;
  label: string;
};

type ToolbarFilterDropdownProps = {
  label: string;
  valueLabel: string;
  value: string;
  options: ToolbarFilterDropdownOption[];
  leadingIcon?: ReactNode;
  active?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  searchable?: boolean;
  onChange: (value: string) => void;
};

export default function ToolbarFilterDropdown({
  label,
  valueLabel,
  value,
  options,
  leadingIcon,
  active = false,
  className,
  triggerClassName,
  menuClassName,
  searchable = true,
  onChange,
}: ToolbarFilterDropdownProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (detailsRef.current && !detailsRef.current.contains(target)) {
        detailsRef.current.open = false;
        setSearchTerm("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (detailsRef.current) detailsRef.current.open = false;
      setSearchTerm("");
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={cn("relative w-full min-w-0 sm:w-auto", className)}>
      <details ref={detailsRef} className="group">
        <summary
          className={cn(
            "list-none flex items-center justify-between gap-2.5 cursor-pointer h-11 rounded-xl border bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 focus:outline-none active:scale-[0.98]",
            active
              ? "border-blue-200 bg-white text-blue-700 hover:bg-slate-50"
              : "border-slate-200",
            triggerClassName,
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            {leadingIcon ? (
              <span className={cn("shrink-0 transition-colors duration-150", active ? "text-blue-600" : "text-slate-500")}>
                {leadingIcon}
              </span>
            ) : null}
            <span className={cn("min-w-0 truncate", active ? "font-semibold text-blue-700" : "font-medium text-slate-700")}>
              {label}
            </span>
            {active ? (
              <span className="shrink-0 transition-colors duration-150 text-blue-700 font-semibold">
                {valueLabel !== label ? `: ${valueLabel}` : ""}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-[transform,color] duration-150 group-open:rotate-180",
                active ? "text-blue-500" : "text-slate-400",
              )}
            />
          </div>
        </summary>

        <div
          className={cn(
            "absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg",
            menuClassName,
          )}
        >
          {searchable ? (
            <div className="mb-1.5 border-b border-slate-100 pb-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  className="h-7 w-full rounded-md border border-slate-200 bg-slate-50 pl-7 pr-2 text-[10px] text-slate-700 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
          ) : null}

          <div className="max-h-60 space-y-0.5 overflow-y-auto overflow-x-hidden">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-1 text-center text-[10px] text-slate-500">Sin resultados</div>
            ) : null}
            
            {filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={(event) => {
                    onChange(option.value);
                    const details = event.currentTarget.closest("details") as HTMLDetailsElement | null;
                    if (details) details.open = false;
                    setSearchTerm("");
                  }}
                  className={cn(
                    "relative no-global-button bg-transparent flex w-full items-center justify-center rounded-md px-5 py-1 text-center text-[10px] transition-all duration-150 focus:outline-none",
                    isSelected
                      ? "font-bold text-slate-900"
                      : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:font-semibold",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="absolute right-2 h-3 w-3 text-slate-900" strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}