import * as React from "react";
import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bo-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-white flex h-12 w-full min-w-0 rounded-xl border border-[var(--color-border-default)] bg-white px-4 py-3 text-sm text-[var(--color-text-strong)] shadow-sm outline-none transition-[border-color,box-shadow,background-color] duration-150 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[var(--color-brand-500)] focus-visible:ring-4 focus-visible:ring-[rgba(179,49,49,0.1)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };