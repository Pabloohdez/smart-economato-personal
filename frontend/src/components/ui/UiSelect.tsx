import { type ReactNode, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "../../lib/utils";

const EMPTY_OPTION_VALUE = "__ui_select_empty__";

export type UiSelectOption = { value: string; label: string; disabled?: boolean };

type UiSelectProps = {
  id?: string;
  label?: string;
  ariaLabel?: string;
  value: string;
  options: UiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  leadingIcon?: ReactNode;
  active?: boolean;
  searchable?: boolean;
  onChange: (value: string) => void;
};

export default function UiSelect(props: UiSelectProps) {
  const {
    id,
    label,
    ariaLabel,
    value,
    options,
    placeholder = "Seleccionar...",
    disabled,
    className,
    triggerClassName,
    contentClassName,
    leadingIcon,
    active = false,
    searchable = true,
    onChange,
  } = props;
  const [searchTerm, setSearchTerm] = useState("");

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) ?? null,
    [options, value],
  );

  const radixValue = value === "" && selected ? EMPTY_OPTION_VALUE : value;

  const visibleOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((opt) => {
      const labelText = opt.label.toLowerCase();
      return labelText.split(/\s+/).some((word) => word.startsWith(normalized));
    });
  }, [options, searchTerm]);

  function handleValueChange(nextValue: string) {
    onChange(nextValue === EMPTY_OPTION_VALUE ? "" : nextValue);
  }

  return (
    <div className={cn("min-w-0", className ?? "")}>
      {label && (
        <label
          htmlFor={id}
          className="block mb-1.5 text-[12px] font-bold text-[var(--color-text-muted)] tracking-wide uppercase"
        >
          {label}
        </label>
      )}

      <SelectPrimitive.Root value={radixValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          data-slot="select-trigger"
          id={id}
          aria-label={ariaLabel ?? label ?? placeholder}
          className={cn(
            "group bo-select w-full justify-between gap-3 box-border",
            active && "border-slate-300 bg-slate-50 text-slate-900 shadow-[0_0_0_4px_rgba(148,163,184,0.12)]",
            !selected && "text-[var(--color-text-muted)]",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {leadingIcon ? <span className="shrink-0 text-slate-400">{leadingIcon}</span> : null}
            <SelectPrimitive.Value asChild placeholder={placeholder}>
              <span className="min-w-0 flex-1 truncate capitalize text-left">
                {selected ? selected.label : placeholder}
              </span>
            </SelectPrimitive.Value>
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#94a3b8] transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className={cn(
              "z-[2147483647] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_48px_rgba(15,23,42,0.08),0_12px_36px_rgba(226,232,240,0.55)] box-border",
              contentClassName,
            )}
            onCloseAutoFocus={() => setSearchTerm("")}
          >
            {searchable && options.length > 8 ? (
              <div className="mb-1.5 border-b border-slate-100 pb-1.5 w-full box-border">
                <div className="relative w-full box-border">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    placeholder="Buscar opción..."
                    className="box-border h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>
            ) : null}
            
            <SelectPrimitive.Viewport className="max-h-[min(320px,calc(100vh-180px))] w-full overflow-y-auto overscroll-contain overflow-x-hidden space-y-0.5 box-border">
              {visibleOptions.length === 0 ? (
                <div className="px-3 py-2 text-center text-[13px] text-slate-500">Sin resultados</div>
              ) : null}
              
              {visibleOptions.map((opt) => (
                <SelectPrimitive.Item
                  key={String(opt.value)}
                  value={opt.value === "" ? EMPTY_OPTION_VALUE : opt.value}
                  disabled={opt.disabled}
                  className="relative flex w-full cursor-pointer items-center justify-center rounded-lg px-8 py-2.5 text-center text-[13px] font-medium text-slate-600 outline-none transition-all duration-150 focus:bg-slate-50 focus:text-slate-900 focus:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-slate-50 data-[state=checked]:font-bold data-[state=checked]:text-slate-900 box-border"
                >
                  <SelectPrimitive.ItemText>
                    <span className="block w-full truncate text-center">{opt.label}</span>
                  </SelectPrimitive.ItemText>
                  <span className="absolute right-3 flex size-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}