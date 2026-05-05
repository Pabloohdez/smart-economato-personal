interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export default function Spinner({ size = "md", label = "Cargando..." }: SpinnerProps) {
  const sizeClass = size === "sm" ? "w-3.5 h-3.5 border-2" : size === "lg" ? "w-7 h-7 border-[3px]" : "w-5 h-5 border-[2.5px]";
  return (
    <div className="flex items-center justify-center gap-[var(--space-3)] py-[var(--space-7)] px-[var(--space-6)] text-[var(--color-text-muted)] text-[14px] font-medium" role="status" aria-label={label}>
      <span
        className={`inline-block rounded-full border border-[var(--color-border-default)] border-t-[var(--color-brand-500)] animate-spin flex-shrink-0 ${sizeClass}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
