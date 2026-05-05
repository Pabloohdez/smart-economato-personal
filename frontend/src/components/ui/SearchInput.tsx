import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  inputClassName?: string;
  maxWidthClassName?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  ariaLabel,
  className = "",
  inputClassName = "",
  maxWidthClassName = "",
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full", maxWidthClassName, className)}>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
        <Search className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("bo-toolbar-input pl-12 pr-4", inputClassName)}
      />
    </div>
  );
}