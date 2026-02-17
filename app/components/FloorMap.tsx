import type { Room } from "../lib/roomData";

interface FloorMapProps {
  huts: Room[];
  onRoomClick: (room: Room) => void;
}

const statusColors: Record<string, string> = {
  available: "var(--success)",
  occupied: "var(--danger)",
  maintenance: "var(--warning)",
  cleaning: "var(--accent-cyan)",
};

const statusBackgrounds: Record<string, string> = {
  available: "rgba(16,185,129,0.14)",
  occupied: "rgba(239,68,68,0.14)",
  maintenance: "rgba(245,158,11,0.14)",
  cleaning: "rgba(6,182,212,0.14)",
};

export function FloorMap({ huts, onRoomClick }: FloorMapProps) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h2 className="flex items-center gap-3 text-[1.3em] font-bold">Hut Map and Status</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-[8px] bg-[var(--bg-card)] px-3 py-2 text-[0.85em] font-semibold">
            <span className="h-3 w-3 rounded-[3px] bg-[var(--success)]" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2 rounded-[8px] bg-[var(--bg-card)] px-3 py-2 text-[0.85em] font-semibold">
            <span className="h-3 w-3 rounded-[3px] bg-[var(--danger)]" />
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2 rounded-[8px] bg-[var(--bg-card)] px-3 py-2 text-[0.85em] font-semibold">
            <span className="h-3 w-3 rounded-[3px] bg-[var(--warning)]" />
            <span>Maintenance</span>
          </div>
          <div className="flex items-center gap-2 rounded-[8px] bg-[var(--bg-card)] px-3 py-2 text-[0.85em] font-semibold">
            <span className="h-3 w-3 rounded-[3px] bg-[var(--accent-cyan)]" />
            <span>Cleaning</span>
          </div>
        </div>
      </div>

      <div className="animate-slide-in rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="font-mono text-[1.2em] font-bold text-[var(--accent-blue)]">
            {huts.length} HUTS
          </div>
          <div className="flex flex-wrap gap-4 text-[0.85em] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <span className="text-[var(--success)]">●</span>
              <span>{huts.filter((room) => room.status === "available").length}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[var(--danger)]">●</span>
              <span>{huts.filter((room) => room.status === "occupied").length}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[var(--warning)]">●</span>
              <span>{huts.filter((room) => room.status === "maintenance").length}</span>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3">
          {huts.map((room) => (
            <button
              key={room.number}
              type="button"
              onClick={() => onRoomClick(room)}
              className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-[12px] border-2 bg-[var(--bg-secondary)] transition duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              style={{
                borderColor: statusColors[room.status],
                backgroundColor: statusBackgrounds[room.status],
              }}
            >
              <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100" />
              <span className="mb-1 font-mono text-[1.3em] font-extrabold">{room.number}</span>
              <span className="text-[0.7em] font-semibold uppercase tracking-[0.5px] text-[var(--text-muted)]">
                {room.type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
