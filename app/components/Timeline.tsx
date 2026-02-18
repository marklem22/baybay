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
  onRangeSelect?: (room: Room, startDayIndex: number, endDayIndex: number) => void;
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

const markerPillSizing: Record<
  TimelineWindow,
  { width: string; fontSize: string; paddingX: string; paddingY: string; gap: string }
> = {
  seven_days: {
    width: "2.5rem",
    fontSize: "0.56rem",
    paddingX: "0.25rem",
    paddingY: "0.16rem",
    gap: "2px",
  },
  current_month: {
    width: "2.15rem",
    fontSize: "0.5rem",
    paddingX: "0.2rem",
    paddingY: "0.12rem",
    gap: "1px",
  },
  two_months: {
    width: "1.9rem",
    fontSize: "0.44rem",
    paddingX: "0.12rem",
    paddingY: "0.08rem",
    gap: "1px",
  },
};

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

export function Timeline({ rooms, timeline, schedules, timelineStartOffset, onRoomClick, onRangeSelect }: TimelineProps) {
  const [windowMode, setWindowMode] = useState<TimelineWindow>("seven_days");
  const [sevenDayOffset, setSevenDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ room: number; day: number } | null>(null);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>(null);
  const [slideToken, setSlideToken] = useState(0);

  // Drag-to-schedule state
  const dragRef = useRef<{ room: Room; startDay: number } | null>(null);
  const [dragRange, setDragRange] = useState<{ roomNumber: number; startDay: number; endDay: number } | null>(null);

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

  // Global mouseup to finalize drag-to-schedule
  useEffect(() => {
    const handleMouseUp = () => {
      const drag = dragRef.current;
      const range = dragRange;
      if (drag && range && range.startDay !== range.endDay && onRangeSelect) {
        const minDay = Math.min(range.startDay, range.endDay);
        const maxDay = Math.max(range.startDay, range.endDay);
        onRangeSelect(drag.room, minDay, maxDay);
      }
      dragRef.current = null;
      setDragRange(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragRange, onRangeSelect]);

  const today = startOfDay(new Date());
  const { dates, startOffset } = buildWindowDates(windowMode, today, monthOffset, sevenDayOffset);
  const days = dates.length;
  const roomColumnWidth = 96;
  const dayColumnMinWidth = windowMode === "seven_days" ? 46 : windowMode === "current_month" ? 36 : 32;
  const timelineMinWidth = roomColumnWidth + days * dayColumnMinWidth;
  const timelineGridTemplate = `${roomColumnWidth}px repeat(${days}, minmax(0, 1fr))`;
  const stickyRoomColumnStyle = { minWidth: `${roomColumnWidth}px` };
  const pillSizing = markerPillSizing[windowMode];

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

                  // Detect check-in / check-out markers per status type
                  const cellDateStr = formatDateInput(date);
                  // Occupied bookings → IN / OUT
                  const isOccupiedCheckIn = roomSchedule.some(
                    (e) => e.status === "occupied" && e.startDate === cellDateStr && e.startDate !== e.endDate,
                  );
                  const isOccupiedCheckOut = roomSchedule.some(
                    (e) => e.status === "occupied" && e.endDate === cellDateStr && e.startDate !== e.endDate,
                  );
                  // Maintenance bookings → START / END
                  const isMaintStart = roomSchedule.some(
                    (e) => e.status === "maintenance" && e.startDate === cellDateStr && e.startDate !== e.endDate,
                  );
                  const isMaintEnd = roomSchedule.some(
                    (e) => e.status === "maintenance" && e.endDate === cellDateStr && e.startDate !== e.endDate,
                  );
                  // Cleaning bookings → START / END
                  const isCleanStart = roomSchedule.some(
                    (e) => e.status === "cleaning" && e.startDate === cellDateStr && e.startDate !== e.endDate,
                  );
                  const isCleanEnd = roomSchedule.some(
                    (e) => e.status === "cleaning" && e.endDate === cellDateStr && e.startDate !== e.endDate,
                  );
                  // Any multi-day marker on this cell?
                  const hasAnyMarker = isOccupiedCheckIn || isOccupiedCheckOut || isMaintStart || isMaintEnd || isCleanStart || isCleanEnd;
                  // Single-day (hourly) booking: same start & end date
                  const singleDayEntry = roomSchedule.find(
                    (e) => e.startDate === cellDateStr && e.endDate === cellDateStr,
                  );
                  const isSingleDay = Boolean(singleDayEntry);
                  const singleDayStatus = singleDayEntry?.status;
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

                  // Drag highlight
                  const isDragHighlight =
                    dragRange &&
                    dragRange.roomNumber === room.number &&
                    timelineDayOffset >= Math.min(dragRange.startDay, dragRange.endDay) &&
                    timelineDayOffset <= Math.max(dragRange.startDay, dragRange.endDay);

                  // Determine marker accent color for cell tint
                  const markerAccent = (isOccupiedCheckIn || isOccupiedCheckOut)
                    ? "var(--danger)"
                    : (isMaintStart || isMaintEnd)
                      ? "var(--warning)"
                      : (isCleanStart || isCleanEnd)
                        ? "var(--accent-cyan)"
                        : singleDayStatus === "occupied"
                          ? "var(--danger)"
                          : singleDayStatus === "maintenance"
                            ? "var(--warning)"
                            : singleDayStatus === "cleaning"
                              ? "var(--accent-cyan)"
                              : null;
                  const hasCellTint = isSingleDay || hasAnyMarker;

                  return (
                    <div
                      key={cellKey}
                      className={`timeline-cell relative cursor-pointer select-none transition-all duration-100 hover:brightness-95 ${isFlipping ? "cell-flip" : ""}`}
                      style={{
                        backgroundColor: isDragHighlight
                          ? "color-mix(in srgb, gray 30%, var(--bg-card))"
                          : (hasCellTint && markerAccent)
                            ? `color-mix(in srgb, ${markerAccent} 30%, var(--bg-card))`
                            : statusBg[status],
                        minHeight: "34px",
                        boxShadow: isDragHighlight
                          ? "inset 0 0 0 2px gray"
                          : isHovered
                            ? `inset 0 0 0 1px ${statusColor[status]}`
                            : (hasCellTint && markerAccent)
                              ? `inset 0 0 0 1px ${markerAccent}`
                              : undefined,
                        perspective: "400px",
                        zIndex: isHovered ? 40 : 1,
                      }}
                      onClick={() => {
                        // Only fire click if not a drag
                        if (!dragRef.current) {
                          onRoomClick(room, timelineDayOffset, status);
                        }
                      }}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        dragRef.current = { room, startDay: timelineDayOffset };
                        setDragRange({ roomNumber: room.number, startDay: timelineDayOffset, endDay: timelineDayOffset });
                      }}
                      onMouseEnter={() => {
                        setHoveredCell({ room: room.number, day: timelineDayOffset });
                        if (dragRef.current && dragRef.current.room.number === room.number) {
                          setDragRange((prev) =>
                            prev ? { ...prev, endDay: timelineDayOffset } : null,
                          );
                        }
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {/* Check-in / Check-out / Start / End badges */}
                      {(() => {
                        // Build compact pills per status type.
                        // OUT/END are filled; IN/START are inverted (white bg with accent text).
                        type Pill = { label: string; accent: string; inverted?: boolean };
                        const pills: Pill[] = [];

                        // Single-day entries: both boundary markers
                        if (isSingleDay) {
                          if (singleDayStatus === "occupied") {
                            pills.push({ label: "OUT", accent: "var(--danger)" });
                            pills.push({ label: "IN", accent: "var(--danger)", inverted: true });
                          } else if (singleDayStatus === "maintenance") {
                            pills.push({ label: "END", accent: "var(--warning)" });
                            pills.push({ label: "START", accent: "var(--warning)", inverted: true });
                          } else if (singleDayStatus === "cleaning") {
                            pills.push({ label: "END", accent: "var(--accent-cyan)" });
                            pills.push({ label: "START", accent: "var(--accent-cyan)", inverted: true });
                          }
                        }

                        // Multi-day occupied
                        if (isOccupiedCheckOut && isOccupiedCheckIn) {
                          pills.push({ label: "OUT", accent: "var(--danger)" });
                          pills.push({ label: "IN", accent: "var(--danger)", inverted: true });
                        } else if (isOccupiedCheckOut) {
                          pills.push({ label: "OUT", accent: "var(--danger)" });
                        } else if (isOccupiedCheckIn) {
                          pills.push({ label: "IN", accent: "var(--danger)", inverted: true });
                        }

                        // Multi-day maintenance
                        if (isMaintEnd && isMaintStart) {
                          pills.push({ label: "END", accent: "var(--warning)" });
                          pills.push({ label: "START", accent: "var(--warning)", inverted: true });
                        } else if (isMaintEnd) {
                          pills.push({ label: "END", accent: "var(--warning)" });
                        } else if (isMaintStart) {
                          pills.push({ label: "START", accent: "var(--warning)", inverted: true });
                        }

                        // Multi-day cleaning
                        if (isCleanEnd && isCleanStart) {
                          pills.push({ label: "END", accent: "var(--accent-cyan)" });
                          pills.push({ label: "START", accent: "var(--accent-cyan)", inverted: true });
                        } else if (isCleanEnd) {
                          pills.push({ label: "END", accent: "var(--accent-cyan)" });
                        } else if (isCleanStart) {
                          pills.push({ label: "START", accent: "var(--accent-cyan)", inverted: true });
                        }

                        if (pills.length === 0) return null;

                        return (
                          <div
                            className="flex h-full w-full flex-col items-center justify-center"
                            style={{ gap: pillSizing.gap }}
                          >
                            {pills.map((p, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center justify-center rounded font-bold leading-none whitespace-nowrap text-center"
                                style={{
                                  width: pillSizing.width,
                                  fontSize: pillSizing.fontSize,
                                  padding: `${pillSizing.paddingY} ${pillSizing.paddingX}`,
                                  backgroundColor: p.inverted ? "#fff" : p.accent,
                                  color: p.inverted ? p.accent : "#fff",
                                  border: p.inverted ? `1px solid ${p.accent}` : "1px solid transparent",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {p.label}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
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
                          {(isOccupiedCheckIn || isOccupiedCheckOut) && !isSingleDay && (
                            <div className="mt-1 flex items-center gap-1.5">
                              {isOccupiedCheckOut && (
                                <span
                                  className="rounded px-1 py-0.5 text-[0.55rem] font-bold leading-none text-white"
                                  style={{ backgroundColor: "var(--danger)" }}
                                >
                                  CHECK-OUT
                                </span>
                              )}
                              {isOccupiedCheckIn && (
                                <span
                                  className="rounded px-1 py-0.5 text-[0.55rem] font-bold leading-none"
                                  style={{
                                    backgroundColor: "#fff",
                                    color: "var(--danger)",
                                    border: "1px solid var(--danger)",
                                  }}
                                >
                                  CHECK-IN
                                </span>
                              )}
                            </div>
                          )}
                          {(isMaintStart || isMaintEnd) && !isSingleDay && (
                            <div className="mt-1 flex items-center gap-1.5">
                              {isMaintEnd && (
                                <span
                                  className="rounded px-1 py-0.5 text-[0.55rem] font-bold leading-none text-white"
                                  style={{ backgroundColor: "var(--warning)" }}
                                >
                                  MAINT. END
                                </span>
                              )}
                              {isMaintStart && (
                                <span
                                  className="rounded px-1 py-0.5 text-[0.55rem] font-bold leading-none"
                                  style={{
                                    backgroundColor: "#fff",
                                    color: "var(--warning)",
                                    border: "1px solid var(--warning)",
                                  }}
                                >
                                  MAINT. START
                                </span>
                              )}
                            </div>
                          )}
                          {(isCleanStart || isCleanEnd) && !isSingleDay && (
                            <div className="mt-1 flex items-center gap-1.5">
                              {isCleanEnd && (
                                <span
                                  className="rounded px-1 py-0.5 text-[0.55rem] font-bold leading-none text-white"
                                  style={{ backgroundColor: "var(--accent-cyan)" }}
                                >
                                  CLEAN END
                                </span>
                              )}
                              {isCleanStart && (
                                <span
                                  className="rounded px-1 py-0.5 text-[0.55rem] font-bold leading-none"
                                  style={{
                                    backgroundColor: "#fff",
                                    color: "var(--accent-cyan)",
                                    border: "1px solid var(--accent-cyan)",
                                  }}
                                >
                                  CLEAN START
                                </span>
                              )}
                            </div>
                          )}
                          {isSingleDay && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className="rounded px-1 py-0.5 text-[0.55rem] font-bold leading-none text-white"
                                style={{ backgroundColor: markerAccent ?? "var(--danger)" }}
                              >
                                {singleDayStatus === "occupied" ? "CHECK-IN / CHECK-OUT" : singleDayStatus === "maintenance" ? "MAINT. START / END" : singleDayStatus === "cleaning" ? "CLEAN START / END" : "START / END"}
                              </span>
                              {singleDayEntry?.checkoutTime ? (
                                <span className="text-[0.6rem] text-[var(--text-secondary)]">
                                  Out at{" "}
                                  {(() => {
                                    const [h] = singleDayEntry.checkoutTime.split(":").map(Number);
                                    return h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`;
                                  })()}
                                </span>
                              ) : null}
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
