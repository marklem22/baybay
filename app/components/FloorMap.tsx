"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Room } from "../lib/roomData";

interface FloorMapProps {
  huts: Room[];
  onRoomClick: (room: Room) => void;
}

type RoomMapView = "floor" | "type" | "all";

interface RoomTypeStyle {
  label: string;
  color: string;
  bg: string;
}

const typePalette: Array<{ color: string; bg: string }> = [
  {
    color: "var(--accent-blue)",
    bg: "color-mix(in srgb, var(--accent-blue) 12%, transparent)",
  },
  {
    color: "var(--accent-cyan)",
    bg: "var(--accent-cyan-soft)",
  },
  {
    color: "var(--success)",
    bg: "var(--success-soft)",
  },
  {
    color: "var(--warning)",
    bg: "var(--warning-soft)",
  },
  {
    color: "var(--danger)",
    bg: "var(--danger-soft)",
  },
];

const roomMapViews: Array<{ id: RoomMapView; label: string }> = [
  { id: "floor", label: "By Floor" },
  { id: "type", label: "By Room Type" },
  { id: "all", label: "All Rooms" },
];

function toTitle(value: string): string {
  return value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTypeStyles(huts: Room[]): Record<string, RoomTypeStyle> {
  const uniqueTypes = Array.from(new Set(huts.map((room) => room.type)));

  return uniqueTypes.reduce<Record<string, RoomTypeStyle>>((acc, type, index) => {
    const palette = typePalette[index % typePalette.length];
    acc[type] = {
      label: toTitle(type),
      color: palette.color,
      bg: palette.bg,
    };
    return acc;
  }, {});
}

interface FloorGroup {
  id: string;
  label: string;
  rooms: Room[];
}

function resolveFloor(room: Room): number | null {
  if (typeof room.floor === "number" && Number.isInteger(room.floor) && room.floor > 0) {
    return room.floor;
  }

  // Fallback for common room numbering patterns like 203 -> Floor 2.
  if (room.number >= 100) {
    const inferred = Math.floor(room.number / 100);
    if (inferred > 0) {
      return inferred;
    }
  }

  return null;
}

function buildFloorGroups(sortedHuts: Room[]): FloorGroup[] {
  const grouped = sortedHuts.reduce(
    (acc, room) => {
      const floor = resolveFloor(room);
      if (floor === null) {
        acc.unassigned.push(room);
      } else {
        const current = acc.byFloor.get(floor) ?? [];
        current.push(room);
        acc.byFloor.set(floor, current);
      }
      return acc;
    },
    { byFloor: new Map<number, Room[]>(), unassigned: [] as Room[] },
  );

  const floorGroups: FloorGroup[] = Array.from(grouped.byFloor.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([floor, rooms]) => ({
      id: `floor-${floor}`,
      label: `Floor ${floor}`,
      rooms,
    }));

  if (grouped.unassigned.length > 0) {
    floorGroups.push({
      id: "unassigned",
      label: "Unassigned Floor",
      rooms: grouped.unassigned,
    });
  }

  return floorGroups;
}

function buildTypeGroups(sortedHuts: Room[], typeStyles: Record<string, RoomTypeStyle>): FloorGroup[] {
  const byType = sortedHuts.reduce((acc, room) => {
    const current = acc.get(room.type) ?? [];
    current.push(room);
    acc.set(room.type, current);
    return acc;
  }, new Map<string, Room[]>());

  return Array.from(byType.entries())
    .sort((a, b) => {
      const aLabel = typeStyles[a[0]]?.label ?? toTitle(a[0]);
      const bLabel = typeStyles[b[0]]?.label ?? toTitle(b[0]);
      return aLabel.localeCompare(bLabel);
    })
    .map(([type, rooms]) => ({
      id: `type-${type}`,
      label: `${typeStyles[type]?.label ?? toTitle(type)} Rooms`,
      rooms,
    }));
}

export function FloorMap({ huts, onRoomClick }: FloorMapProps) {
  const [viewMode, setViewMode] = useState<RoomMapView>("floor");
  const typeStyles = useMemo(() => buildTypeStyles(huts), [huts]);
  const sortedHuts = useMemo(() => [...huts].sort((a, b) => a.number - b.number), [huts]);
  const typeCounts = useMemo(
    () =>
      huts.reduce(
        (acc, room) => {
          acc[room.type] = (acc[room.type] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [huts],
  );
  const sortedTypeKeys = useMemo(
    () => Object.keys(typeStyles).sort((a, b) => typeStyles[a].label.localeCompare(typeStyles[b].label)),
    [typeStyles],
  );
  const groups = useMemo(() => {
    if (viewMode === "all") {
      return [{ id: "all-rooms", label: "All Rooms", rooms: sortedHuts }];
    }
    if (viewMode === "type") {
      return buildTypeGroups(sortedHuts, typeStyles);
    }
    return buildFloorGroups(sortedHuts);
  }, [sortedHuts, typeStyles, viewMode]);

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
            {sortedTypeKeys.map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium"
                style={{ color: typeStyles[type].color, backgroundColor: typeStyles[type].bg }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: typeStyles[type].color }} />
                {typeStyles[type].label}: {typeCounts[type] ?? 0}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          {roomMapViews.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setViewMode(view.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                viewMode === view.id
                  ? "bg-[var(--accent-blue)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {huts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            No rooms match the current filters.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                    {group.label}
                  </h3>
                  <span className="font-mono text-[0.72rem] text-[var(--text-secondary)]">
                    {group.rooms.length} room{group.rooms.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
                  {group.rooms.map((room) => (
                    <button
                      key={room.number}
                      type="button"
                      onClick={() => onRoomClick(room)}
                      className="flex aspect-square flex-col items-center justify-center rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      style={{
                        borderColor: typeStyles[room.type]?.color ?? "var(--border)",
                        backgroundColor: typeStyles[room.type]?.bg ?? "var(--bg-card)",
                      }}
                    >
                      <span className="font-mono text-base font-semibold">{room.number}</span>
                      {room.name ? (
                        <span className="max-w-[70px] truncate text-[0.55rem] font-medium text-[var(--text-primary)]">
                          {room.name}
                        </span>
                      ) : null}
                      <span className="text-[0.6rem] font-medium uppercase text-[var(--text-muted)]">
                        {typeStyles[room.type]?.label ?? toTitle(room.type)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

