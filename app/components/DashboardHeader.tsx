interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  statusLabel: string;
  dateTime: string;
}

export function DashboardHeader({ title, subtitle, statusLabel, dateTime }: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8">
      <div className="flex items-center gap-5">
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[16px] bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] text-[28px] font-extrabold shadow-[0_10px_30px_rgba(59,130,246,0.3)]">
          RM
        </div>
        <div>
          <h1 className="text-[1.8em] font-extrabold tracking-[-0.5px]">{title}</h1>
          <p className="text-[0.9em] font-medium text-[var(--text-secondary)]">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.1)] px-5 py-2 text-[0.9em] font-semibold text-[var(--success)]">
          <span className="pulse-dot h-2 w-2 rounded-full bg-[var(--success)]" />
          <span>{statusLabel}</span>
        </div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] px-5 py-2 font-mono text-[0.9em] text-[var(--text-secondary)]">
          {dateTime}
        </div>
      </div>
    </header>
  );
}
