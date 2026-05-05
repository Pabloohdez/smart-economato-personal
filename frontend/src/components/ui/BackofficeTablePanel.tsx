import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type BackofficeTablePanelProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export default function BackofficeTablePanel({
  header,
  footer,
  children,
  className,
  bodyClassName,
}: BackofficeTablePanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08),0_24px_56px_rgba(226,232,240,0.55)]",
        className,
      )}
    >
      {header ? <div className="border-b border-slate-200/80 px-5 py-4 sm:px-6">{header}</div> : null}
      <div className={cn("px-3 pb-3 pt-3 sm:px-4", bodyClassName)}>{children}</div>
      {footer ? <div className="border-t border-slate-200/80 bg-white">{footer}</div> : null}
    </section>
  );
}