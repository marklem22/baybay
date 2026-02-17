import type { Room, RoomStatus } from "../lib/roomData";

interface TimelineProps {
  rooms: Room[];
  days: number;
  timeline: Record<number, RoomStatus[]>;
}

const statusDot: Record<RoomStatus, string> = {
  available: "bg-[var(--success)]",
  occupied: "bg-[var(--danger)]",
  maintenance: "bg-[var(--warning)]",
  cleaning: "bg-[var(--accent-cyan)]",
};

export function Timeline({ rooms, days, timeline }: TimelineProps) {
  return (
    <section className="overflow-x-auto rounded-[16px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[1.3em] font-bold">30-Day Availability Timeline</h2>
      </div>
      <div className="min-w-[1200px]">
        <div
          className="grid gap-px overflow-hidden rounded-[10px] bg-[var(--border)]"
          style={{ gridTemplateColumns: `100px repeat(${days}, minmax(50px, 1fr))` }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-center bg-[var(--bg-primary)] px-2 py-4 text-[0.75em] font-bold text-[var(--accent-blue)]">
            ROOM
          </div>
          {Array.from({ length: days }).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() + index);
            return (
              <div
                key={`header-${index}`}
                className="sticky top-0 z-10 flex items-center justify-center bg-[var(--bg-primary)] px-2 py-4 text-[0.75em] font-bold text-[var(--accent-blue)]"
              >
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            );
          })}

          {rooms.map((room) => (
            <div key={room.number} className="contents">
              <div className="sticky left-0 z-10 flex items-center bg-[var(--bg-primary)] px-4 py-3 font-mono text-[0.75em] font-bold">
                {room.number}
              </div>
              {Array.from({ length: days }).map((_, index) => {
                const status = timeline[room.number]?.[index] ?? "available";
                return (
                  <div
                    key={`${room.number}-${index}`}
                    className="flex items-center justify-center bg-[var(--bg-card)] px-2 py-3 text-[0.75em] transition hover:scale-110 hover:bg-[var(--hover)]"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${statusDot[status]}`} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
