import Button from "./Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: string };
}

export default function EmptyState({ icon = "fa-solid fa-box-open", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-[var(--space-8)] px-[var(--space-6)] text-center gap-[var(--space-4)] text-[var(--color-text-muted)]">
      <i className={`${icon} text-[40px] opacity-35 text-[var(--color-brand-500)]`} aria-hidden="true" />
      <p className="text-[17px] font-bold text-[var(--color-text-strong)] m-0">{title}</p>
      {description && (
        <p className="text-[14px] text-[var(--color-text-muted)] m-0 max-w-[340px] leading-[1.6]">
          {description}
        </p>
      )}
      {action && (
        <Button variant="secondary" size="sm" icon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
