import Link from "next/link";
import type { Room } from "../lib/roomData";

interface FloorMapProps {
  huts: Room[];
  onRoomClick: (room: Room) => void;
}

const typeStyles: Record<Room["type"], { label: string; color: string; bg: string }> = {
  single: {
    label: "Single",
    color: "var(--accent-blue)",
    bg: "color-mix(in srgb, var(--accent-blue) 12%, transparent)",
  },
  double: {
    label: "Double",
    color: "var(--accent-cyan)",
    bg: "var(--accent-cyan-soft)",
  },
  suite: {
    label: "Suite",
    color: "var(--success)",
    bg: "var(--success-soft)",
  },
  deluxe: {
    label: "Deluxe",
    color: "var(--warning)",
    bg: "var(--warning-soft)",
  },
};

export function FloorMap({ huts, onRoomClick }: FloorMapProps) {
  const typeCounts = huts.reduce(
    (acc, room) => {
      acc[room.type] += 1;
      return acc;
    },
    {
      single: 0,
      double: 0,
      suite: 0,
      deluxe: 0,
    } as Record<Room["type"], number>,
  );

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Room Map</h2>
        <Link
          href="/rooms/new"
          className="rounded-md border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Add Room
        </Link>
      </div>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Room status changes by date. Use the timeline for day-by-day availability.
      </p>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <span className="font-mono text-sm font-semibold text-[var(--accent-blue)]">
            {huts.length} Rooms
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(typeStyles) as Room["type"][]).map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium"
                style={{ color: typeStyles[type].color, backgroundColor: typeStyles[type].bg }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: typeStyles[type].color }} />
                {typeStyles[type].label}: {typeCounts[type]}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
          {huts.map((room) => (
            <button
              key={room.number}
              type="button"
              onClick={() => onRoomClick(room)}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                borderColor: typeStyles[room.type].color,
                backgroundColor: typeStyles[room.type].bg,
              }}
            >
              <span className="font-mono text-base font-semibold">{room.number}</span>
              {room.name ? (
                <span className="max-w-[70px] truncate text-[0.55rem] font-medium text-[var(--text-primary)]">
                  {room.name}
                </span>
              ) : null}
              <span className="text-[0.6rem] font-medium uppercase text-[var(--text-muted)]">
                {room.type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

