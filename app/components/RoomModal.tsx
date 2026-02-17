"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Room, RoomStatus, StatusEntry } from "../lib/roomData";
import { formatDateInput, generateId } from "../lib/roomData";

interface RoomModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  /** The display date string for the selected timeline cell */
  selectedDate?: string;
  /** The raw YYYY-MM-DD date for the selected timeline cell */
  selectedDateRaw?: string;
  /** The status on the selected day */
  selectedDayStatus?: RoomStatus;
  /** Existing schedule entries for this room */
  schedule?: StatusEntry[];
  /** Callback to save schedule changes */
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

const statusIcon: Record<RoomStatus, string> = {
  available: "✓",
  occupied: "●",
  maintenance: "⚙",
  cleaning: "✦",
};

const allStatuses: RoomStatus[] = ["available", "occupied", "maintenance", "cleaning"];

export function RoomModal({
  room,
  isOpen,
  onClose,
  selectedDate,
  selectedDateRaw,
  selectedDayStatus,
  schedule = [],
  onUpdateSchedule,
}: RoomModalProps) {
  const [localSchedule, setLocalSchedule] = useState<StatusEntry[]>(schedule);
  const [showRangeForm, setShowRangeForm] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  // Range form state
  const todayStr = formatDateInput(new Date());
  const [rangeStatus, setRangeStatus] = useState<RoomStatus>("occupied");
  const [rangeStart, setRangeStart] = useState(todayStr);
  const [rangeEnd, setRangeEnd] = useState(todayStr);

  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  // Clear confirm message after 2s
  useEffect(() => {
    if (!confirmMsg) return;
    const t = setTimeout(() => setConfirmMsg(null), 2000);
    return () => clearTimeout(t);
  }, [confirmMsg]);

  if (!isOpen || !room) return null;

  const dayStatus = selectedDayStatus ?? room.status;
  const capacityLabel = `${room.capacity} Guest${room.capacity > 1 ? "s" : ""}`;
  const isFromTimeline = Boolean(selectedDate && selectedDateRaw);

  const commitSchedule = (entries: StatusEntry[], msg: string) => {
    setLocalSchedule(entries);
    onUpdateSchedule?.(room.number, entries);
    setConfirmMsg(msg);
  };

  const handleSetDayStatus = (status: RoomStatus) => {
    if (!selectedDateRaw) return;
    // Remove any existing entry for this exact date, then add the new one
    const filtered = localSchedule.filter(
      (e) => !(e.startDate === selectedDateRaw && e.endDate === selectedDateRaw),
    );
    const entry: StatusEntry = {
      id: generateId(),
      status,
      startDate: selectedDateRaw,
      endDate: selectedDateRaw,
    };
    commitSchedule([...filtered, entry], `Set to ${statusLabel[status]}`);
  };

  const handleAddRange = () => {
    if (rangeStart > rangeEnd) return;
    const entry: StatusEntry = {
      id: generateId(),
      status: rangeStatus,
      startDate: rangeStart,
      endDate: rangeEnd,
    };
    commitSchedule([...localSchedule, entry], `Range added`);
    setShowRangeForm(false);
    setRangeStart(todayStr);
    setRangeEnd(todayStr);
    setRangeStatus("occupied");
  };

  const handleRemoveEntry = (id: string) => {
    const updated = localSchedule.filter((e) => e.id !== id);
    commitSchedule(updated, "Entry removed");
  };

  const formatRange = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    if (start === end) return s.toLocaleDateString("en-US", opts);
    return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ── */}
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Single-Day Status Change (when opened from timeline) ── */}
        {isFromTimeline && (
          <div className="p-5">
            <div className="mb-3 text-center">
              <div className="text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {selectedDate}
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                Set status for this day
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {allStatuses.map((s) => {
                const isActive = s === dayStatus;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => !isActive && handleSetDayStatus(s)}
                    className={`relative flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                      isActive
                        ? "border-transparent text-white shadow-md"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:shadow-sm cursor-pointer"
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: statusColor[s], borderColor: statusColor[s] }
                        : undefined
                    }
                  >
                    <span className="text-base">{statusIcon[s]}</span>
                    <span>{statusLabel[s]}</span>
                    {isActive && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.65rem] font-normal opacity-70">
                        current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inline confirmation */}
            {confirmMsg && (
              <div className="mt-3 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-center text-xs font-medium text-[var(--success)] animate-fade-in">
                ✓ {confirmMsg}
              </div>
            )}
          </div>
        )}

        {/* ── Room Map click (no specific date) ── */}
        {!isFromTimeline && (
          <div className="p-5 text-center text-xs text-[var(--text-muted)]">
            Click a date on the <span className="font-semibold text-[var(--text-secondary)]">Availability Timeline</span> to change status for a specific day.
          </div>
        )}

        {/* ── Schedule List ── */}
        <div className="border-t border-[var(--border)] px-5 pt-4 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Scheduled Changes
            </h3>
            <button
              type="button"
              onClick={() => setShowRangeForm(!showRangeForm)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[0.7rem] font-medium text-[var(--accent-blue)] transition hover:bg-[var(--hover)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showRangeForm ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </>
                )}
              </svg>
              {showRangeForm ? "Cancel" : "Schedule Range"}
            </button>
          </div>

          {/* Range form */}
          {showRangeForm && (
            <div className="mb-4 rounded-xl border border-[var(--accent-blue)]/20 bg-[var(--bg-card)] p-4 animate-slide-up">
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Set a status for multiple days at once.
              </p>
              <div className="mb-3">
                <label className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {allStatuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRangeStatus(s)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        rangeStatus === s
                          ? "border-transparent text-white"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                      }`}
                      style={rangeStatus === s ? { backgroundColor: statusColor[s] } : undefined}
                    >
                      <span className="text-xs">{statusIcon[s]}</span>
                      {statusLabel[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">From</label>
                  <input
                    type="date"
                    value={rangeStart}
                    min={todayStr}
                    onChange={(e) => {
                      setRangeStart(e.target.value);
                      if (e.target.value > rangeEnd) setRangeEnd(e.target.value);
                    }}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">To</label>
                  <input
                    type="date"
                    value={rangeEnd}
                    min={rangeStart}
                    onChange={(e) => setRangeEnd(e.target.value)}
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
            </div>
          )}

          {/* Entries list */}
          {localSchedule.length > 0 ? (
            <div className="mb-3 flex flex-col gap-2">
              {localSchedule.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-white"
                      style={{ backgroundColor: statusColor[entry.status] }}
                    >
                      {statusIcon[entry.status]}
                    </span>
                    <div>
                      <div className="text-xs font-semibold capitalize">{statusLabel[entry.status]}</div>
                      <div className="text-[0.65rem] text-[var(--text-muted)]">
                        {formatRange(entry.startDate, entry.endDate)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                    aria-label="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
