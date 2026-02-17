"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Room, RoomStatus, StatusEntry } from "../lib/roomData";
import { formatDateInput, generateId } from "../lib/roomData";

interface RoomModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  selectedDateRaw?: string;
  selectedDayStatus?: RoomStatus;
  selectedDayEntry?: StatusEntry | null;
  schedule?: StatusEntry[];
  onUpdateSchedule?: (roomNumber: number, entries: StatusEntry[]) => void;
}

const statusColor: Record<RoomStatus, string> = {
  available: "var(--success)",
  occupied: "var(--danger)",
  maintenance: "var(--warning)",
  cleaning: "var(--accent-cyan)",
};

const statusLabel: Record<RoomStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Maintenance",
  cleaning: "Cleaning",
};

const statusCode: Record<RoomStatus, string> = {
  available: "AV",
  occupied: "OC",
  maintenance: "MT",
  cleaning: "CL",
};

const allStatuses: RoomStatus[] = ["available", "occupied", "maintenance", "cleaning"];
type EditorMode = "day" | "range";

export function RoomModal({
  room,
  isOpen,
  onClose,
  selectedDate,
  selectedDateRaw,
  selectedDayStatus,
  selectedDayEntry = null,
  schedule = [],
  onUpdateSchedule,
}: RoomModalProps) {
  const [localSchedule, setLocalSchedule] = useState<StatusEntry[]>(schedule);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [dayOverlapError, setDayOverlapError] = useState<string | null>(null);
  const [dayBookingError, setDayBookingError] = useState<string | null>(null);
  const [rangeOverlapError, setRangeOverlapError] = useState<string | null>(null);
  const [rangeBookingError, setRangeBookingError] = useState<string | null>(null);

  const todayStr = formatDateInput(new Date());
  const [rangeStatus, setRangeStatus] = useState<RoomStatus>("occupied");
  const [rangeStart, setRangeStart] = useState(todayStr);
  const [rangeEnd, setRangeEnd] = useState(todayStr);
  const [dayBookerName, setDayBookerName] = useState("");
  const [rangeBookerName, setRangeBookerName] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>(selectedDateRaw ? "day" : "range");

  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  useEffect(() => {
    if (!selectedDateRaw || !selectedDayEntry || selectedDayEntry.status !== "occupied") return;
    if (selectedDayEntry.bookedBy) {
      setDayBookerName(selectedDayEntry.bookedBy);
    }
  }, [selectedDateRaw, selectedDayEntry]);

  useEffect(() => {
    setEditorMode(selectedDateRaw ? "day" : "range");
  }, [selectedDateRaw]);

  useEffect(() => {
    if (!confirmMsg) return;
    const t = setTimeout(() => setConfirmMsg(null), 2000);
    return () => clearTimeout(t);
  }, [confirmMsg]);

  useEffect(() => {
    if (!dayOverlapError) return;
    const t = setTimeout(() => setDayOverlapError(null), 3000);
    return () => clearTimeout(t);
  }, [dayOverlapError]);

  useEffect(() => {
    if (!dayBookingError) return;
    const t = setTimeout(() => setDayBookingError(null), 3000);
    return () => clearTimeout(t);
  }, [dayBookingError]);

  useEffect(() => {
    if (!rangeOverlapError) return;
    const t = setTimeout(() => setRangeOverlapError(null), 3000);
    return () => clearTimeout(t);
  }, [rangeOverlapError]);

  useEffect(() => {
    if (!rangeBookingError) return;
    const t = setTimeout(() => setRangeBookingError(null), 3000);
    return () => clearTimeout(t);
  }, [rangeBookingError]);

  if (!isOpen || !room) return null;

  const dayStatus = selectedDayStatus ?? room.status;
  const capacityLabel = `${room.capacity} Guest${room.capacity > 1 ? "s" : ""}`;
  const isFromTimeline = Boolean(selectedDate && selectedDateRaw);
  const selectedEntryForDay = selectedDateRaw
    ? [...localSchedule]
        .reverse()
        .find((entry) => selectedDateRaw >= entry.startDate && selectedDateRaw <= entry.endDate) ?? selectedDayEntry
    : selectedDayEntry;

  const commitSchedule = (entries: StatusEntry[], msg: string) => {
    setLocalSchedule(entries);
    onUpdateSchedule?.(room.number, entries);
    setConfirmMsg(msg);
  };

  const findOverlap = (
    start: string,
    end: string,
    excludeIds: Set<string> = new Set(),
  ): StatusEntry | null => {
    for (const entry of localSchedule) {
      if (excludeIds.has(entry.id)) continue;
      if (start <= entry.endDate && entry.startDate <= end) {
        return entry;
      }
    }
    return null;
  };

  const formatRange = (start: string, end: string) => {
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    if (start === end) return s.toLocaleDateString("en-US", opts);
    return `${s.toLocaleDateString("en-US", opts)} - ${e.toLocaleDateString("en-US", opts)}`;
  };

  const handleSetDayStatus = (status: RoomStatus) => {
    if (!selectedDateRaw) return;

    setDayOverlapError(null);
    setDayBookingError(null);

    const trimmedDayBooker = dayBookerName.trim();
    if (status === "occupied" && trimmedDayBooker.length === 0) {
      setDayBookingError("Please enter the booker name before setting Occupied.");
      return;
    }

    const replacedIds = new Set(
      localSchedule
        .filter((entry) => entry.startDate === selectedDateRaw && entry.endDate === selectedDateRaw)
        .map((entry) => entry.id),
    );

    const overlap = findOverlap(selectedDateRaw, selectedDateRaw, replacedIds);
    if (overlap) {
      const rangeLabel = formatRange(overlap.startDate, overlap.endDate);
      setDayOverlapError(
        `This day conflicts with an existing ${statusLabel[overlap.status]} booking (${rangeLabel}).`,
      );
      return;
    }

    const filtered = localSchedule.filter((entry) => !replacedIds.has(entry.id));
    const entry: StatusEntry = {
      id: generateId(),
      status,
      startDate: selectedDateRaw,
      endDate: selectedDateRaw,
      ...(status === "occupied" ? { bookedBy: trimmedDayBooker } : {}),
    };

    commitSchedule([...filtered, entry], `Set to ${statusLabel[status]}`);
  };

  const handleAddRange = () => {
    if (rangeStart > rangeEnd) return;

    setRangeOverlapError(null);
    setRangeBookingError(null);

    const trimmedRangeBooker = rangeBookerName.trim();
    if (rangeStatus === "occupied" && trimmedRangeBooker.length === 0) {
      setRangeBookingError("Please enter the booker name for occupied schedules.");
      return;
    }

    const overlap = findOverlap(rangeStart, rangeEnd);
    if (overlap) {
      const rangeLabel = formatRange(overlap.startDate, overlap.endDate);
      setRangeOverlapError(
        `This range conflicts with an existing ${statusLabel[overlap.status]} booking (${rangeLabel}). Remove it first or choose non-overlapping dates.`,
      );
      return;
    }

    const entry: StatusEntry = {
      id: generateId(),
      status: rangeStatus,
      startDate: rangeStart,
      endDate: rangeEnd,
      ...(rangeStatus === "occupied" ? { bookedBy: trimmedRangeBooker } : {}),
    };

    commitSchedule([...localSchedule, entry], "Range added");
    setRangeStart(todayStr);
    setRangeEnd(todayStr);
    setRangeStatus("occupied");
    setRangeBookerName("");
  };

  const handleRemoveEntry = (id: string) => {
    const updated = localSchedule.filter((entry) => entry.id !== id);
    commitSchedule(updated, "Entry removed");
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl animate-slide-up"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-[var(--border)] p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-lg font-semibold">Room #{room.number}</h2>
                {room.name ? (
                  <span className="rounded-md bg-[var(--bg-card)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-primary)]">
                    {room.name}
                  </span>
                ) : null}
                <span className="rounded-md px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-[var(--text-muted)]">
                  {room.type}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {room.zone ?? "Main"} Zone &middot; {capacityLabel}
              </p>
              <div className="mt-2">
                <Link
                  href={`/rooms/${room.number}/edit`}
                  onClick={onClose}
                  className="inline-flex rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--hover)]"
                >
                  Edit Room
                </Link>
              </div>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              aria-label="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-y border-[var(--border)] px-5 py-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (isFromTimeline) setEditorMode("day");
              }}
              disabled={!isFromTimeline}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                editorMode === "day"
                  ? "border-transparent bg-[var(--accent-blue)] text-white"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--hover)]"
              } ${!isFromTimeline ? "cursor-not-allowed opacity-50" : ""}`}
            >
              One Day
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("range")}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                editorMode === "range"
                  ? "border-transparent bg-[var(--accent-blue)] text-white"
                  : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--hover)]"
              }`}
            >
              Schedule
            </button>
          </div>
        </div>

        {editorMode === "day" ? (
          isFromTimeline ? (
            <div className="border-b border-[var(--border)] p-5">
              <div className="mb-3 text-center">
                <div className="text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {selectedDate}
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  Set status for this day
                </div>
              </div>

              {selectedEntryForDay?.status === "occupied" && selectedEntryForDay.bookedBy ? (
                <div className="mb-3 rounded-lg border border-[var(--accent-blue)]/30 bg-[var(--hover)] px-3 py-2 text-xs text-[var(--text-primary)]">
                  Booked by <span className="font-semibold">{selectedEntryForDay.bookedBy}</span>
                </div>
              ) : null}

              <div className="mb-3">
                <label className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Booker Name (for Occupied on this day)
                </label>
                <input
                  type="text"
                  value={dayBookerName}
                  onChange={(event) => setDayBookerName(event.target.value)}
                  placeholder="Example: Juan Dela Cruz"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {allStatuses.map((status) => {
                  const isActive = status === dayStatus;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        if (!isActive) handleSetDayStatus(status);
                      }}
                      className={`relative flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                        isActive
                          ? "border-transparent text-white shadow-md"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:shadow-sm"
                      }`}
                      style={isActive ? { backgroundColor: statusColor[status], borderColor: statusColor[status] } : undefined}
                    >
                      <span className="inline-flex min-w-[1.8rem] justify-center rounded-md bg-black/10 px-1.5 py-0.5 text-[0.62rem] font-semibold">
                        {statusCode[status]}
                      </span>
                      <span>{statusLabel[status]}</span>
                      {isActive ? (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.65rem] font-normal opacity-70">
                          current
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {confirmMsg ? (
                <div className="mt-3 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--success)] animate-fade-in">
                  {confirmMsg}
                </div>
              ) : null}

              {dayOverlapError ? (
                <div className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--danger)] animate-fade-in">
                  {dayOverlapError}
                </div>
              ) : null}

              {dayBookingError ? (
                <div className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--danger)] animate-fade-in">
                  {dayBookingError}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="border-b border-[var(--border)] p-5 text-center text-xs text-[var(--text-muted)]">
              Click a date on the{" "}
              <span className="font-semibold text-[var(--text-secondary)]">Availability Timeline</span>{" "}
              to use One Day mode.
            </div>
          )
        ) : (
          <div className="border-b border-[var(--border)] p-5">
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Set a status for multiple days at once.
            </p>

            <div className="mb-3">
              <label className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Booker Name (for Occupied schedule)
              </label>
              <input
                type="text"
                value={rangeBookerName}
                onChange={(event) => setRangeBookerName(event.target.value)}
                placeholder="Example: Juan Dela Cruz"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/40"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {allStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRangeStatus(status)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      rangeStatus === status
                        ? "border-transparent text-white"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                    }`}
                    style={rangeStatus === status ? { backgroundColor: statusColor[status] } : undefined}
                  >
                    <span className="inline-flex min-w-[1.7rem] justify-center rounded-md bg-black/10 px-1.5 py-0.5 text-[0.62rem] font-semibold">
                      {statusCode[status]}
                    </span>
                    {statusLabel[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  From
                </label>
                <input
                  type="date"
                  value={rangeStart}
                  min={todayStr}
                  onChange={(event) => {
                    setRangeStart(event.target.value);
                    if (event.target.value > rangeEnd) {
                      setRangeEnd(event.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  To
                </label>
                <input
                  type="date"
                  value={rangeEnd}
                  min={rangeStart}
                  onChange={(event) => setRangeEnd(event.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/40"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddRange}
              disabled={rangeStart > rangeEnd}
              className="w-full rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              Add to Schedule
            </button>

            {confirmMsg ? (
              <div className="mt-3 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--success)] animate-fade-in">
                {confirmMsg}
              </div>
            ) : null}

            {rangeOverlapError ? (
              <div className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--danger)] animate-fade-in">
                {rangeOverlapError}
              </div>
            ) : null}

            {rangeBookingError ? (
              <div className="mt-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--danger)] animate-fade-in">
                {rangeBookingError}
              </div>
            ) : null}
          </div>
        )}

        <div className="px-5 pb-2 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Scheduled Changes
            </h3>
          </div>

          {localSchedule.length > 0 ? (
            <div className="mb-3 flex flex-col gap-2">
              {localSchedule.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-lg text-[0.65rem] font-semibold text-white"
                      style={{ backgroundColor: statusColor[entry.status] }}
                    >
                      {statusCode[entry.status]}
                    </span>
                    <div>
                      <div className="text-xs font-semibold capitalize">{statusLabel[entry.status]}</div>
                      <div className="text-[0.65rem] text-[var(--text-muted)]">
                        {formatRange(entry.startDate, entry.endDate)}
                      </div>
                      {entry.status === "occupied" && entry.bookedBy ? (
                        <div className="text-[0.65rem] text-[var(--text-secondary)]">
                          Booked by{" "}
                          <span className="font-semibold text-[var(--text-primary)]">{entry.bookedBy}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                    aria-label="Remove"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-3 rounded-lg border border-dashed border-[var(--border)] px-4 py-3 text-center text-xs text-[var(--text-muted)]">
              No scheduled changes yet. All days use the default Available status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
