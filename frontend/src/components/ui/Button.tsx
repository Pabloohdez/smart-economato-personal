import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium leading-none transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-sm hover:bg-primary/95",
        secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300",
        success: "bg-[#2f9e63] text-white shadow-sm hover:brightness-95",
        danger:
          "text-white shadow-sm bg-[linear-gradient(135deg,#ef4444,var(--color-danger-500))] hover:brightness-95",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading = false, icon, children, disabled, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2",
            variant === "secondary" || variant === "ghost"
              ? "border-[var(--color-border-default)] border-t-[var(--color-brand-500)]"
              : "border-white/40 border-t-white",
          )}
          aria-hidden="true"
        />
      ) : icon ? (
        <i className={icon} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
});

export default Button;
