import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-right"
      expand
      richColors
      closeButton
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border !border-[var(--color-border-default)] !bg-white !text-[var(--color-text-strong)] !shadow-[0_18px_40px_rgba(17,24,39,0.14)]",
          description: "!text-[var(--color-text-muted)]",
          actionButton: "!bg-primary !text-white",
          cancelButton: "!bg-[var(--color-bg-soft)] !text-[var(--color-text-default)]",
        },
      }}
      style={{
        ["--normal-bg" as string]: "var(--color-bg-surface)",
        ["--normal-text" as string]: "var(--color-text-strong)",
        ["--normal-border" as string]: "var(--color-border-default)",
        ["--success-bg" as string]: "#ecfdf3",
        ["--success-text" as string]: "#047857",
        ["--warning-bg" as string]: "#fff7ed",
        ["--warning-text" as string]: "#c2410c",
        ["--error-bg" as string]: "#fef2f2",
        ["--error-text" as string]: "#b91c1c",
        ["--border-radius" as string]: "18px",
      }}
      {...props}
    />
  );
}

export { Toaster };