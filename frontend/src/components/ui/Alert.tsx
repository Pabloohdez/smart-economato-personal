const ICONS: Record<string, string> = {
  error:   "fa-solid fa-circle-exclamation",
  success: "fa-solid fa-circle-check",
  warning: "fa-solid fa-triangle-exclamation",
  info:    "fa-solid fa-circle-info",
};

interface AlertProps {
  type?: "error" | "success" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Alert({ type = "error", title, children, className = "" }: AlertProps) {
  const stylesByType: Record<NonNullable<AlertProps["type"]>, { box: string; icon: string }> = {
    error:   { box: "bg-[#fff5f5] text-[#c53030] border-[#feb2b2]", icon: "text-[#c53030]" },
    success: { box: "bg-[#f0fff4] text-[#276749] border-[#9ae6b4]", icon: "text-[#276749]" },
    warning: { box: "bg-[#fffaf0] text-[#c05621] border-[#fbd38d]", icon: "text-[#c05621]" },
    info:    { box: "bg-[#ebf8ff] text-[#2b6cb0] border-[#90cdf4]", icon: "text-[#2b6cb0]" },
  };
  const s = stylesByType[type];

  return (
    <div
      className={[
        "flex items-start gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-4)] rounded-[var(--radius-md)] text-[14px] font-medium leading-[1.5] border",
        s.box,
        className,
      ].join(" ")}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <i className={`${ICONS[type]} text-[16px] flex-shrink-0 mt-px ${s.icon}`} aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        {title && (
          <span className="font-bold text-[13px] uppercase tracking-[0.04em]">
            {title}
          </span>
        )}
        <span>{children}</span>
      </div>
    </div>
  );
}
