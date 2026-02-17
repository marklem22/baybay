"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { DashboardHeader } from "../../components/DashboardHeader";
import { useAppState } from "../../context/AppContext";
import type { Room, RoomStatus } from "../../lib/roomData";

interface ArchivedRoom {
  room: Room;
  archivedAt: string;
}

interface ArchiveResponse {
  data: ArchivedRoom[];
  total: number;
}

type PendingAction =
  | { type: "restore-single"; numbers: [number] }
  | { type: "restore-selected"; numbers: number[] }
  | { type: "restore-all" }
  | { type: "perma-delete-single"; numbers: [number] }
  | { type: "perma-delete-selected"; numbers: number[] }
  | { type: "perma-delete-all" };

type NumberScopedAction = Exclude<
  PendingAction,
  { type: "restore-all" } | { type: "perma-delete-all" }
>;

const statusColor: Record<RoomStatus, string> = {
  available: "var(--success)",
  occupied: "var(--danger)",
  maintenance: "var(--warning)",
  cleaning: "var(--accent-cyan)",
};

function formatRoomCount(count: number): string {
  return `${count} room${count === 1 ? "" : "s"}`;
}

export default function ArchivedRoomsPage() {
  const { dateTime, setToast, refreshHuts } = useAppState();
  const [archive, setArchive] = useState<ArchivedRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const loadArchive = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch("/api/huts/archive", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Load failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ArchiveResponse;
      const nextData = Array.isArray(payload.data) ? payload.data : [];
      setArchive(nextData);
      setSelectedNumbers(new Set());
    } catch (error) {
      console.error("Failed to load archived rooms", error);
      setToast("Could not load archived rooms.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setToast]);

  useEffect(() => {
    void loadArchive();
  }, [loadArchive]);

  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const selectedCount = selectedNumbers.size;
  const allSelected = archive.length > 0 && archive.every((entry) => selectedNumbers.has(entry.room.number));

  const toggleSelect = (roomNumber: number) => {
    setSelectedNumbers((current) => {
      const next = new Set(current);
      if (next.has(roomNumber)) {
        next.delete(roomNumber);
      } else {
        next.add(roomNumber);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedNumbers((current) => {
      const next = new Set(current);
      if (allSelected) {
        archive.forEach((entry) => next.delete(entry.room.number));
      } else {
        archive.forEach((entry) => next.add(entry.room.number));
      }
      return next;
    });
  };

  const actionTargetCount = useMemo(() => {
    if (!pendingAction) {
      return 0;
    }
    if (pendingAction.type.endsWith("-all")) {
      return archive.length;
    }
    return (pendingAction as NumberScopedAction).numbers.length;
  }, [pendingAction, archive.length]);

  const modalInfo = useMemo(() => {
    if (!pendingAction) {
      return {
        title: "",
        description: "",
        confirmLabel: "",
        tone: "primary" as const,
      };
    }

    const countLabel = formatRoomCount(actionTargetCount);

    if (pendingAction.type.startsWith("restore")) {
      return {
        title:
          pendingAction.type === "restore-all"
            ? "Restore all archived rooms?"
            : pendingAction.type === "restore-selected"
              ? `Restore ${countLabel}?`
              : "Restore this room?",
        description: `${countLabel} will be moved back to active rooms.`,
        confirmLabel:
          pendingAction.type === "restore-all"
            ? "Restore All"
            : pendingAction.type === "restore-selected"
              ? "Restore Selected"
              : "Restore",
        tone: "primary" as const,
      };
    }

    return {
      title:
        pendingAction.type === "perma-delete-all"
          ? "Permanently delete all archived rooms?"
          : pendingAction.type === "perma-delete-selected"
            ? `Permanently delete ${countLabel}?`
            : "Permanently delete this archived room?",
      description: `This action cannot be undone. ${countLabel} will be removed from archive.`,
      confirmLabel:
        pendingAction.type === "perma-delete-all"
          ? "Delete All"
          : pendingAction.type === "perma-delete-selected"
            ? "Delete Selected"
            : "Delete",
      tone: "danger" as const,
    };
  }, [pendingAction, actionTargetCount]);

  const closeModal = () => {
    if (isActionSubmitting) {
      return;
    }
    setPendingAction(null);
  };

  const handleConfirm = async () => {
    if (!pendingAction || actionTargetCount === 0) {
      setPendingAction(null);
      return;
    }

    setIsActionSubmitting(true);
    try {
      if (pendingAction.type.startsWith("restore")) {
        const requestBody =
          pendingAction.type === "restore-all"
            ? { mode: "all" }
            : { mode: "selected", numbers: (pendingAction as NumberScopedAction).numbers };

        const response = await fetch("/api/huts/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Restore failed.");
        }

        setToast(`Restored ${formatRoomCount(actionTargetCount)}.`);
        await Promise.all([loadArchive(true), refreshHuts()]);
      } else {
        const requestBody =
          pendingAction.type === "perma-delete-all"
            ? { mode: "all" }
            : { mode: "selected", numbers: (pendingAction as NumberScopedAction).numbers };

        const response = await fetch("/api/huts/archive", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Delete failed.");
        }

        setToast(`Deleted ${formatRoomCount(actionTargetCount)} from archive.`);
        await loadArchive(true);
      }

      setPendingAction(null);
      setSelectedNumbers(new Set());
    } catch (error) {
      console.error("Archived room action failed", error);
      setToast("Operation failed. Please try again.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-4 pt-14 sm:p-6 md:pt-6">
      <DashboardHeader
        title="Archived Rooms"
        subtitle="Restore rooms back to active inventory or clean up archived entries."
        statusLabel="ARCHIVE"
        dateTime={dateTime}
      />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {archive.length} archived total
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void loadArchive(true);
              }}
              disabled={isRefreshing || isActionSubmitting}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href="/"
              className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)]"
            >
              Back to Rooms
            </Link>
          </div>
        </div>
      </section>

      <section>
        {isLoading ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">
            Loading archived rooms...
          </div>
        ) : archive.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
            <svg
              className="mx-auto mb-3"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            <p className="text-sm font-medium">No archived rooms</p>
            <p className="mt-1 text-xs">Archived rooms will appear here when you archive from Edit Room.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-[var(--text-secondary)]">{selectedCount} selected</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedNumbers(new Set())}
                  disabled={selectedCount === 0 || isActionSubmitting}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[0.72rem] font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCount > 0) {
                      setPendingAction({ type: "restore-selected", numbers: Array.from(selectedNumbers) });
                    }
                  }}
                  disabled={selectedCount === 0 || isActionSubmitting}
                  className="rounded-md border border-[var(--accent-blue)]/40 bg-[color-mix(in_srgb,var(--accent-blue)_12%,transparent)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--accent-blue)] transition hover:opacity-90 disabled:opacity-50"
                >
                  Restore Selected
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: "restore-all" })}
                  disabled={archive.length === 0 || isActionSubmitting}
                  className="rounded-md border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Restore All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCount > 0) {
                      setPendingAction({ type: "perma-delete-selected", numbers: Array.from(selectedNumbers) });
                    }
                  }}
                  disabled={selectedCount === 0 || isActionSubmitting}
                  className="rounded-md border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--danger)] transition hover:opacity-90 disabled:opacity-50"
                >
                  Delete Selected
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAction({ type: "perma-delete-all" })}
                  disabled={archive.length === 0 || isActionSubmitting}
                  className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Delete All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all archived rooms"
                        className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-blue)]"
                      />
                    </th>
                    <th className="px-4 py-3">Archived At</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Capacity</th>
                    <th className="px-4 py-3">Floor</th>
                    <th className="px-4 py-3">Zone</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.map((entry) => {
                    const isSelected = selectedNumbers.has(entry.room.number);
                    const roomStatus = entry.room.status;
                    return (
                      <tr
                        key={`${entry.room.number}-${entry.archivedAt}`}
                        className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--hover)]"
                        style={isSelected ? { backgroundColor: "var(--hover)" } : undefined}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(entry.room.number)}
                            className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-blue)]"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                          {formatTimestamp(entry.archivedAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                          Room {entry.room.number}
                          {entry.room.name ? (
                            <span className="ml-2 text-xs font-medium text-[var(--text-secondary)]">
                              {entry.room.name}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs capitalize text-[var(--text-secondary)]">
                          {entry.room.type}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              color: statusColor[roomStatus],
                              backgroundColor: `color-mix(in srgb, ${statusColor[roomStatus]} 15%, transparent)`,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: statusColor[roomStatus] }}
                            />
                            {roomStatus.charAt(0).toUpperCase() + roomStatus.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{entry.room.capacity}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {entry.room.floor ?? "--"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {entry.room.zone ?? "--"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPendingAction({ type: "restore-single", numbers: [entry.room.number] })}
                              disabled={isActionSubmitting}
                              className="rounded-md border border-[var(--accent-blue)]/30 px-2.5 py-1 text-[0.72rem] font-medium text-[var(--accent-blue)] transition hover:bg-[color-mix(in_srgb,var(--accent-blue)_12%,transparent)] disabled:opacity-50"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction({ type: "perma-delete-single", numbers: [entry.room.number] })
                              }
                              disabled={isActionSubmitting}
                              className="rounded-md border border-[var(--danger)]/30 px-2.5 py-1 text-[0.72rem] font-medium text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <ConfirmationModal
        isOpen={pendingAction !== null}
        title={modalInfo.title}
        description={modalInfo.description}
        confirmLabel={modalInfo.confirmLabel}
        cancelLabel="Cancel"
        tone={modalInfo.tone}
        isLoading={isActionSubmitting}
        onClose={closeModal}
        onConfirm={() => {
          void handleConfirm();
        }}
      />
    </div>
  );
}
