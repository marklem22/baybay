interface FiltersSectionProps {
  startDate: string;
  endDate: string;
  roomType: string;
  status: string;
  onChange: (field: "startDate" | "endDate" | "roomType" | "status", value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function FiltersSection({
  startDate,
  endDate,
  roomType,
  status,
  onChange,
  onApply,
  onReset,
}: FiltersSectionProps) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8">
      <div className="mb-5 flex items-center gap-2 text-[1.1em] font-bold text-[var(--text-primary)]">
        Date Range Filter
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-end gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[0.85em] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
            Check-in Date
          </label>
          <input
            type="date"
            className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 font-mono text-[0.95em] text-[var(--text-primary)] transition focus:border-[var(--accent-blue)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.1)]"
            value={startDate}
            onChange={(event) => onChange("startDate", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[0.85em] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
            Check-out Date
          </label>
          <input
            type="date"
            className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 font-mono text-[0.95em] text-[var(--text-primary)] transition focus:border-[var(--accent-blue)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.1)]"
            value={endDate}
            onChange={(event) => onChange("endDate", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[0.85em] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
            Hut Type
          </label>
          <select
            className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 font-mono text-[0.95em] text-[var(--text-primary)] transition focus:border-[var(--accent-blue)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.1)]"
            value={roomType}
            onChange={(event) => onChange("roomType", event.target.value)}
          >
            <option value="all">All Types</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="suite">Suite</option>
            <option value="deluxe">Deluxe</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[0.85em] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
            Status
          </label>
          <select
            className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 font-mono text-[0.95em] text-[var(--text-primary)] transition focus:border-[var(--accent-blue)] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.1)]"
            value={status}
            onChange={(event) => onChange("status", event.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
          </select>
        </div>
        <button
          className="rounded-[12px] bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] px-7 py-3 text-[0.95em] font-bold uppercase tracking-[0.5px] text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(59,130,246,0.4)]"
          onClick={onApply}
          type="button"
        >
          Apply Filter
        </button>
        <button
          className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] px-7 py-3 text-[0.95em] font-bold uppercase tracking-[0.5px] text-[var(--text-primary)] transition hover:border-[var(--accent-blue)] hover:shadow-[0_10px_30px_rgba(59,130,246,0.2)]"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
