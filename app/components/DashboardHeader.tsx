interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  statusLabel: string;
  dateTime: string;
}

export function DashboardHeader({
  title,
  subtitle,
  statusLabel,
  dateTime,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--success-soft)] px-3 py-1.5 text-xs font-medium text-[var(--success)]">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          <span>{statusLabel}</span>
        </div>
        <div className="rounded-lg bg-[var(--bg-card)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)]">
          {dateTime}
        </div>
      </div>
    </header>
  );
}
