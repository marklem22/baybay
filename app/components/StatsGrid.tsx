export interface StatItem {
  label: string;
  value: string | number;
  subtitle: string;
  icon: string;
  accentColor?: string;
}

interface StatsGridProps {
  items: StatItem[];
}

export function StatsGrid({ items }: StatsGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="group rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition duration-200 hover:border-[var(--accent-blue)]/20"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {item.label}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-card)] text-xs font-medium text-[var(--text-muted)]">
              {item.icon}
            </span>
          </div>
          <div
            className="mb-1 font-mono text-2xl font-semibold leading-none"
            style={item.accentColor ? { color: item.accentColor } : undefined}
          >
            {item.value}
          </div>
          <div className="text-xs text-[var(--text-muted)]">{item.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
