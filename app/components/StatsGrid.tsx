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
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="group relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg-secondary)] p-7 transition duration-300 hover:-translate-y-1 hover:border-[var(--accent-blue)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        >
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)]" />
          <div className="mb-4 flex items-start justify-between">
            <div className="text-[0.85em] font-bold uppercase tracking-[1.5px] text-[var(--text-secondary)]">
              {item.label}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--bg-card)] text-lg">
              {item.icon}
            </div>
          </div>
          <div
            className="mb-2 font-mono text-[2.8em] font-extrabold leading-none"
            style={item.accentColor ? { color: item.accentColor } : undefined}
          >
            {item.value}
          </div>
          <div className="text-[0.9em] text-[var(--text-muted)]">{item.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
