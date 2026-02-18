"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatDateInput,
  getScheduleEntryForDate,
  getStatusForDate,
  type Room,
  type RoomStatus,
  type StatusEntry,
} from "../lib/roomData";

interface TimelineProps {
  rooms: Room[];
  timeline: Record<number, RoomStatus[]>;
  schedules: Record<number, StatusEntry[]>;
  timelineStartOffset: number;
  onRoomClick: (room: Room, dayIndex: number, status: RoomStatus) => void;
}

const statusColor: Record<RoomStatus, string> = {
  available: "var(--success)",
  occupied: "var(--danger)",
  maintenance: "var(--warning)",
  cleaning: "var(--accent-cyan)",
};

const statusBg: Record<RoomStatus, string> = {
  available: "color-mix(in srgb, var(--success) 42%, var(--bg-card))",
  occupied: "color-mix(in srgb, var(--danger) 42%, var(--bg-card))",
  maintenance: "color-mix(in srgb, var(--warning) 42%, var(--bg-card))",
  cleaning: "color-mix(in srgb, var(--accent-cyan) 42%, var(--bg-card))",
};

const statusLabel: Record<RoomStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Maintenance",
  cleaning: "Cleaning",
};

const DAY_MS = 1000 * 60 * 60 * 24;
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"] as const;
type TimelineWindow = "seven_days" | "current_month" | "two_months";
type SlideDirection = "left" | "right" | null;

interface TimelineWindowConfig {
  id: TimelineWindow;
  label: string;
}

const timelineWindows: TimelineWindowConfig[] = [
  { id: "seven_days", label: "7 Days" },
  { id: "current_month", label: "Current Month" },
  { id: "two_months", label: "2 Months" },
];

function startOfDay(value: Date): Date {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function diffDayOffset(fromDate: Date, toDate: Date): number {
  return Math.floor((startOfDay(toDate).getTime() - startOfDay(fromDate).getTime()) / DAY_MS);
}

function buildMonthSpanWindow(
  today: Date,
  monthOffset: number,
  spanMonths: 1 | 2,
): { dates: Date[]; startOffset: number } {
  const windowStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const windowEnd = new Date(today.getFullYear(), today.getMonth() + monthOffset + spanMonths, 0);
  const startOffset = diffDayOffset(today, windowStart);
  const endOffset = diffDayOffset(today, windowEnd);
  const days = endOffset - startOffset + 1;
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return { dates, startOffset };
}

function buildWindowDates(
  windowMode: TimelineWindow,
  today: Date,
  monthOffset: number,
  sevenDayOffset: number,
): { dates: Date[]; startOffset: number } {
  const currentDay = startOfDay(today);

  if (windowMode === "seven_days") {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentDay);
      d.setDate(d.getDate() + sevenDayOffset + i);
      return d;
    });
    return { dates, startOffset: sevenDayOffset };
  }

  if (windowMode === "current_month") {
    return buildMonthSpanWindow(currentDay, monthOffset, 1);
  }

  return buildMonthSpanWindow(currentDay, monthOffset, 2);
}

export function Timeline({ rooms, timeline, schedules, timelineStartOffset, onRoomClick }: TimelineProps) {
  const [windowMode, setWindowMode] = useState<TimelineWindow>("seven_days");
  const [sevenDayOffset, setSevenDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ room: number; day: number } | null>(null);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>(null);
  const [slideToken, setSlideToken] = useState(0);

  // Track previous statuses for flip animation
  const prevTimelineRef = useRef<Record<number, RoomStatus[]>>({});
  const [flippingCells, setFlippingCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevTimelineRef.current;
    const changedKeys = new Set<string>();

    for (const room of rooms) {
      const oldStatuses = prev[room.number];
      const newStatuses = timeline[room.number];
      if (!oldStatuses || !newStatuses) continue;

      for (let i = 0; i < newStatuses.length; i++) {
        if (oldStatuses[i] !== undefined && oldStatuses[i] !== newStatuses[i]) {
          const timelineDayOffset = timelineStartOffset + i;
          changedKeys.add(`${room.number}-${timelineDayOffset}`);
        }
      }
    }

    if (changedKeys.size > 0) {
      setFlippingCells(changedKeys);
      const timer = setTimeout(() => setFlippingCells(new Set()), 600);
      return () => clearTimeout(timer);
    }

    // Store current as previous for next comparison
    prevTimelineRef.current = { ...timeline };
  }, [timeline, rooms, timelineStartOffset]);

  // Update ref after animation triggers
  useEffect(() => {
    if (flippingCells.size === 0) {
      prevTimelineRef.current = { ...timeline };
    }
  }, [flippingCells, timeline]);

  const today = startOfDay(new Date());
  const { dates, startOffset } = buildWindowDates(windowMode, today, monthOffset, sevenDayOffset);
  const days = dates.length;
  const roomColumnWidth = 96;
  const dayColumnMinWidth = windowMode === "seven_days" ? 46 : windowMode === "current_month" ? 36 : 32;
  const timelineMinWidth = roomColumnWidth + days * dayColumnMinWidth;
  const timelineGridTemplate = `${roomColumnWidth}px repeat(${days}, minmax(0, 1fr))`;
  const stickyRoomColumnStyle = { minWidth: `${roomColumnWidth}px` };

  const handleWindowSelect = (nextMode: TimelineWindow) => {
    setSlideDirection(null);
    setWindowMode(nextMode);
    if (nextMode === "seven_days") {
      setSevenDayOffset(0);
      return;
    }
    setMonthOffset(0);
  };

  const handlePrevious = () => {
    setSlideDirection("right");
    setSlideToken((current) => current + 1);

    if (windowMode === "seven_days") {
      setSevenDayOffset((current) => current - 7);
      return;
    }

    if (windowMode === "current_month") {
      setMonthOffset((current) => current - 1);
      return;
    }

    setMonthOffset((current) => current - 2);
  };

  const handleNext = () => {
    setSlideDirection("left");
    setSlideToken((current) => current + 1);

    if (windowMode === "seven_days") {
      setSevenDayOffset((current) => current + 7);
      return;
    }

    if (windowMode === "current_month") {
      setMonthOffset((current) => current + 1);
      return;
    }

    setMonthOffset((current) => current + 2);
  };

  // Find where months change for header labels
  const monthBreaks: { index: number; label: string }[] = [];
  let lastMonth = -1;
  dates.forEach((d, i) => {
    const m = d.getMonth();
    if (m !== lastMonth) {
      monthBreaks.push({
        index: i,
        label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      });
      lastMonth = m;
    }
  });

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Header bar */}
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">Availability Timeline</h2>
        <div className="flex flex-wrap items-center gap-2">
          {timelineWindows.map((windowOption) => (
            <button
              key={windowOption.id}
              type="button"
              onClick={() => handleWindowSelect(windowOption.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                windowMode === windowOption.id
                  ? "bg-[var(--accent-blue)] text-white"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {windowOption.label}
            </button>
          ))}
          <div className="mx-1 hidden h-4 w-px bg-[var(--border)] sm:block" />
          <button
            type="button"
            onClick={handlePrevious}
            className="rounded-md bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Previous range"
          >
            &larr;
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-md bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Next range"
          >
            &rarr;
          </button>
          <div className="mx-2 hidden h-4 w-px bg-[var(--border)] sm:block" />
          <div className="flex flex-wrap gap-3">
            {(["available", "occupied", "maintenance", "cleaning"] as RoomStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[0.65rem] text-[var(--text-muted)]">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: statusColor[s] }}
                />
                <span>{statusLabel[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline grid */}
      <div className="overflow-x-auto p-4">
        <div
          key={`timeline-window-${windowMode}-${startOffset}-${slideToken}`}
          className={slideDirection ? `timeline-window-slide-${slideDirection}` : undefined}
          style={{ minWidth: `${Math.max(720, timelineMinWidth)}px` }}
        >
          {/* Month row */}
          <div
            className="grid"
            style={{ gridTemplateColumns: timelineGridTemplate }}
          >
            <div
              className="sticky left-0 z-30 border-b border-[var(--border)] bg-[var(--bg-secondary)]"
              style={stickyRoomColumnStyle}
            />
            {monthBreaks.map((mb, idx) => {
              const nextIdx = idx < monthBreaks.length - 1 ? monthBreaks[idx + 1].index : days;
              const span = nextIdx - mb.index;
              return (
                <div
                  key={mb.label}
                  className="border-b border-[var(--border)] px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent-blue)]"
                  style={{ gridColumn: `span ${span}` }}
                >
                  {mb.label}
                </div>
              );
            })}
          </div>

          {/* Date header row */}
          <div
            className="grid gap-px overflow-hidden rounded-t-lg border border-[var(--border)] bg-[var(--border)]"
            style={{ gridTemplateColumns: timelineGridTemplate }}
          >
            <div
              className="sticky left-0 z-30 flex items-end bg-[var(--bg-secondary)] px-2 pb-1 pt-2 text-[0.6rem] font-medium uppercase tracking-wider text-[var(--text-muted)] shadow-[1px_0_0_0_var(--border)]"
              style={stickyRoomColumnStyle}
            >
              Room
            </div>
            {dates.map((date, index) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isToday = date.toDateString() === today.toDateString();
              return (
                <div
                  key={`hdr-${index}`}
                  className={`flex flex-col items-center justify-end bg-[var(--bg-secondary)] pb-1 pt-2 text-center ${
                    isToday ? "text-[var(--accent-blue)]" : isWeekend ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
                  }`}
                >
                  <span className="whitespace-nowrap text-[0.55rem] font-medium">
                    {weekdayLabels[date.getDay()]}
                  </span>
                  <span className={`text-[0.7rem] font-semibold ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-blue)] text-white" : ""}`}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Room rows */}
          <div className="mt-px flex flex-col gap-px rounded-b-lg border border-t-0 border-[var(--border)] bg-[var(--border)]">
            {rooms.map((room) => (
              <div
                key={room.number}
                className="grid gap-px"
                style={{ gridTemplateColumns: timelineGridTemplate }}
              >
                <div
                  className="sticky left-0 z-20 flex items-center bg-[var(--bg-secondary)] px-2 py-0.5 shadow-[1px_0_0_0_var(--border)]"
                  style={stickyRoomColumnStyle}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                      #{room.number}
                    </span>
                    <span className="hidden text-[0.6rem] capitalize text-[var(--text-muted)] sm:inline">
                      {room.type}
                    </span>
                  </div>
                </div>

                {dates.map((date, index) => {
                  const timelineDayOffset = startOffset + index;
                  const timelineArrayIndex = timelineDayOffset - timelineStartOffset;
                  const timelineStatus = timeline[room.number]?.[timelineArrayIndex];
                  const roomSchedule = schedules[room.number] ?? [];
                  const scheduleEntry = getScheduleEntryForDate(
                    roomSchedule,
                    date,
                  );
                  const scheduleStatus = getStatusForDate(
                    roomSchedule,
                    date,
                    room.status,
                  );
                  const status = timelineStatus ?? scheduleStatus;

                  // Detect check-in / check-out markers
                  const cellDateStr = formatDateInput(date);
                  const isCheckIn = roomSchedule.some(
                    (e) => e.startDate === cellDateStr && e.startDate !== e.endDate,
                  );
                  const isCheckOut = roomSchedule.some(
                    (e) => e.endDate === cellDateStr && e.startDate !== e.endDate,
                  );
                  const cellKey = `${room.number}-${timelineDayOffset}`;
                  const isFlipping = flippingCells.has(cellKey);
                  const isHovered =
                    hoveredCell?.room === room.number && hoveredCell?.day === timelineDayOffset;
                  const isNearStart = index < 2;
                  const isNearEnd = index >= days - 2;
                  const tooltipPositionClass = isNearStart
                    ? "left-1 translate-x-0"
                    : isNearEnd
                      ? "right-1 left-auto translate-x-0"
                      : "left-1/2 -translate-x-1/2";
                  const tooltipArrowClass = isNearStart
                    ? "left-4"
                    : isNearEnd
                      ? "right-4"
                      : "left-1/2 -translate-x-1/2";
                  const dateStr = date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={cellKey}
                      className={`timeline-cell relative cursor-pointer transition-all duration-100 hover:brightness-95 ${isFlipping ? "cell-flip" : ""}`}
                      style={{
                        backgroundColor: (isCheckIn || isCheckOut)
                          ? "color-mix(in srgb, var(--danger) 30%, var(--bg-card))"
                          : statusBg[status],
                        minHeight: "34px",
                        boxShadow: isHovered
                          ? `inset 0 0 0 1px ${statusColor[status]}`
                          : (isCheckIn || isCheckOut)
                            ? "inset 0 0 0 1px var(--danger)"
                            : undefined,
                        perspective: "400px",
                        zIndex: isHovered ? 40 : 1,
                      }}
                      onClick={() => onRoomClick(room, timelineDayOffset, status)}
                      onMouseEnter={() => setHoveredCell({ room: room.number, day: timelineDayOffset })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {/* Check-in / Check-out badge */}
                      {(isCheckIn || isCheckOut) && (
                        <div className="flex h-full items-center justify-center">
                          <span
                            className="rounded px-1 text-[0.5rem] font-bold leading-tight"
                            style={{
                              backgroundColor: "var(--danger)",
                              color: "#fff",
                              letterSpacing: "0.03em",
                            }}
                          >
                            {isCheckIn ? "IN" : "OUT"}
                          </span>
                        </div>
                      )}
                      {isHovered && (
                        <div
                          className={`absolute bottom-full z-50 mb-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 shadow-lg ${tooltipPositionClass}`}
                          style={{ whiteSpace: "nowrap", pointerEvents: "none" }}
                        >
                          <div className="text-xs font-semibold text-[var(--text-primary)]">
                            Room #{room.number} &middot; {room.type}
                          </div>
                          <div className="text-[0.65rem] text-[var(--text-secondary)]">{dateStr}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-sm"
                              style={{ backgroundColor: statusColor[status] }}
                            />
                            <span className="text-[0.65rem] font-medium" style={{ color: statusColor[status] }}>
                              {statusLabel[status]}
                            </span>
                          </div>
                          {status === "occupied" && scheduleEntry?.bookedBy ? (
                            <div className="mt-1 text-[0.65rem] text-[var(--text-secondary)]">
                              Booked by{" "}
                              <span className="font-semibold text-[var(--text-primary)]">
                                {scheduleEntry.bookedBy}
                              </span>
                            </div>
                          ) : null}
                          {(isCheckIn || isCheckOut) && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className="rounded px-1 py-0.5 text-[0.55rem] font-bold leading-none text-white"
                                style={{
                                  backgroundColor: "var(--danger)",
                                }}
                              >
                                {isCheckIn ? "CHECK-IN" : "CHECK-OUT"}
                              </span>
                            </div>
                          )}
                          <div
                            className={`absolute top-full border-4 border-transparent border-t-[var(--bg-secondary)] ${tooltipArrowClass}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
