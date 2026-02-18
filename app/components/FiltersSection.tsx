interface FiltersSectionProps {
  startDate: string;
  endDate: string;
  roomType: string;
  roomTypeOptions: { key: string; label: string }[];
  status: string;
  onChange: (field: "startDate" | "endDate" | "roomType" | "status", value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function FiltersSection({
  startDate,
  endDate,
  roomType,
  roomTypeOptions,
  status,
  onChange,
  onApply,
  onReset,
}: FiltersSectionProps) {
  const inputClass =
    "h-[38px] min-h-[38px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] transition focus:border-[var(--accent-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/20";

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
      <div className="mb-4 text-sm font-medium text-[var(--text-primary)]">
        Filters
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-muted)]">
            Check-in
          </label>
          <input
            type="date"
            className={inputClass}
            value={startDate}
            onChange={(event) => onChange("startDate", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-muted)]">
            Check-out
          </label>
          <input
            type="date"
            className={inputClass}
            value={endDate}
            onChange={(event) => onChange("endDate", event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-muted)]">
            Room Type
          </label>
          <select
            className={`cursor-pointer ${inputClass}`}
            value={roomType}
            onChange={(event) => onChange("roomType", event.target.value)}
          >
            <option value="all">All Types</option>
            {roomTypeOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-muted)]">
            Status
          </label>
          <select
            className={`cursor-pointer ${inputClass}`}
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
        <div className="flex gap-2">
          <button
            className="h-[38px] min-h-[38px] rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            onClick={onApply}
            type="button"
          >
            Apply
          </button>
          <button
            className="h-[38px] min-h-[38px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            onClick={onReset}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
