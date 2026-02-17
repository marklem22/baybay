"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { useAppState } from "../context/AppContext";
import type { ActivityLog, ActivityLogAction, RoomStatus } from "../lib/roomData";

const PAGE_SIZE = 100;

interface LogsSummary {
  total: number;
  added: number;
  removed: number;
  byStatus: Record<RoomStatus, number>;
}

interface LogsResponse {
  data: ActivityLog[];
  meta: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  summary?: LogsSummary;
}

interface LogsDeleteResponse {
  success?: boolean;
  deletedCount?: number;
  error?: string;
}

type PendingDeleteAction =
  | { type: "single"; ids: [string] }
  | { type: "selected"; ids: string[] }
  | { type: "all" };

const emptySummary: LogsSummary = {
  total: 0,
  added: 0,
  removed: 0,
  byStatus: {
    available: 0,
    occupied: 0,
    maintenance: 0,
    cleaning: 0,
  },
};

function buildSummary(logs: ActivityLog[]): LogsSummary {
  return logs.reduce<LogsSummary>(
    (acc, entry) => {
      acc.total += 1;
      if (entry.action === "schedule_added") {
        acc.added += 1;
      } else {
        acc.removed += 1;
      }
      acc.byStatus[entry.status] += 1;
      return acc;
    },
    {
      total: 0,
      added: 0,
      removed: 0,
      byStatus: {
        available: 0,
        occupied: 0,
        maintenance: 0,
        cleaning: 0,
      },
    },
  );
}

function formatEntryCount(count: number): string {
  return `${count} log entr${count === 1 ? "y" : "ies"}`;
}

export default function LogsPage() {
  const { dateTime, setToast } = useAppState();
  const printRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<LogsSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteAction | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const loadLogs = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch(`/api/logs?limit=${PAGE_SIZE}&offset=0&summary=1`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Load failed with status ${response.status}`);
      }

      const payload = (await response.json()) as LogsResponse;
      const nextData = Array.isArray(payload.data) ? payload.data : [];
      const nextSummary = payload.summary ?? buildSummary(nextData);

      setLogs(nextData);
      setSummary(nextSummary);
      setHasMore(Boolean(payload.meta?.hasMore));
      setNextOffset(nextData.length);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to load activity logs", error);
      setToast("Could not load activity logs.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setToast]);

  const loadMoreLogs = useCallback(async () => {
    if (!hasMore || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const response = await fetch(`/api/logs?limit=${PAGE_SIZE}&offset=${nextOffset}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Load failed with status ${response.status}`);
      }

      const payload = (await response.json()) as LogsResponse;
      const nextData = Array.isArray(payload.data) ? payload.data : [];

      setLogs((current) => {
        const existingIds = new Set(current.map((entry) => entry.id));
        const deduped = nextData.filter((entry) => !existingIds.has(entry.id));
        return [...current, ...deduped];
      });
      setHasMore(Boolean(payload.meta?.hasMore));
      setNextOffset((current) => current + nextData.length);
    } catch (error) {
      console.error("Failed to load more activity logs", error);
      setToast("Could not load more activity logs.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextOffset, setToast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const statusColor: Record<RoomStatus, string> = {
    available: "var(--success)",
    occupied: "var(--danger)",
    maintenance: "var(--warning)",
    cleaning: "var(--accent-cyan)",
  };
  const actionLabel: Record<ActivityLogAction, string> = {
    schedule_added: "Schedule Added",
    schedule_removed: "Schedule Removed",
  };
  const actionColor: Record<ActivityLogAction, string> = {
    schedule_added: "var(--success)",
    schedule_removed: "var(--danger)",
  };

  const generatedAt = useMemo(() => {
    return new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [summary.total, logs.length]);

  const selectedCount = selectedIds.size;
  const allVisibleSelected = logs.length > 0 && logs.every((entry) => selectedIds.has(entry.id));

  const deleteTargetCount = useMemo(() => {
    if (!pendingDelete) {
      return 0;
    }
    if (pendingDelete.type === "all") {
      return summary.total;
    }
    return pendingDelete.ids.length;
  }, [pendingDelete, summary.total]);

  const deleteModalTitle = useMemo(() => {
    if (!pendingDelete) {
      return "";
    }
    if (pendingDelete.type === "all") {
      return "Delete all activity logs?";
    }
    if (pendingDelete.type === "selected") {
      return `Delete ${formatEntryCount(deleteTargetCount)}?`;
    }
    return "Delete this log entry?";
  }, [pendingDelete, deleteTargetCount]);

  const deleteModalDescription = useMemo(() => {
    if (!pendingDelete) {
      return "";
    }
    if (deleteTargetCount === 0) {
      return "There are no entries to delete.";
    }
    return `This action cannot be undone. ${formatEntryCount(deleteTargetCount)} will be permanently removed.`;
  }, [pendingDelete, deleteTargetCount]);

  const deleteConfirmLabel = useMemo(() => {
    if (!pendingDelete) {
      return "Delete";
    }
    if (pendingDelete.type === "all") {
      return "Delete All";
    }
    if (pendingDelete.type === "selected") {
      return "Delete Selected";
    }
    return "Delete";
  }, [pendingDelete]);

  const formatRange = (startDate: string, endDate: string) => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

    if (startDate === endDate) {
      return start.toLocaleDateString("en-US", options);
    }

    return `${start.toLocaleDateString("en-US", options)} to ${end.toLocaleDateString("en-US", options)}`;
  };

  const formatTimestamp = (createdAt: string) =>
    new Date(createdAt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        logs.forEach((entry) => next.delete(entry.id));
      } else {
        logs.forEach((entry) => next.add(entry.id));
      }
      return next;
    });
  };

  const openDeleteSingle = (id: string) => {
    setPendingDelete({ type: "single", ids: [id] });
  };

  const openDeleteSelected = () => {
    if (selectedCount === 0) {
      return;
    }
    setPendingDelete({ type: "selected", ids: Array.from(selectedIds) });
  };

  const openDeleteAll = () => {
    if (summary.total === 0) {
      return;
    }
    setPendingDelete({ type: "all" });
  };

  const closeDeleteModal = () => {
    if (isDeleteSubmitting) {
      return;
    }
    setPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleteTargetCount === 0) {
      setPendingDelete(null);
      return;
    }

    setIsDeleteSubmitting(true);
    try {
      const requestBody =
        pendingDelete.type === "all"
          ? { mode: "all" }
          : { mode: "selected", ids: pendingDelete.ids };

      const response = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response.json().catch(() => null)) as LogsDeleteResponse | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? `Delete failed with status ${response.status}`);
      }

      const deletedCount =
        typeof payload?.deletedCount === "number" ? payload.deletedCount : deleteTargetCount;

      setPendingDelete(null);
      setSelectedIds(new Set());

      if (pendingDelete.type === "all") {
        setToast(`Deleted ${formatEntryCount(deletedCount)}.`);
      } else if (pendingDelete.type === "selected") {
        setToast(`Deleted ${formatEntryCount(deletedCount)}.`);
      } else {
        setToast("Log entry deleted.");
      }

      await loadLogs(true);
    } catch (error) {
      console.error("Failed to delete logs", error);
      setToast("Failed to delete logs.");
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 pt-14 print:mx-0 print:max-w-none print:gap-4 print:p-0 print:text-black sm:p-6 md:pt-6" ref={printRef}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-tight">Activity Log Report</h1>
          <p className="mt-1 text-[0.875rem] text-[var(--text-secondary)]">
            Professional audit trail of schedule actions with JSON-backed persistence.
          </p>
          <p className="mt-2 text-[0.75rem] font-mono text-[var(--text-muted)]">
            Generated: {generatedAt}
          </p>
          <p className="mt-1 text-[0.72rem] text-[var(--text-muted)]">
            Showing {logs.length} of {summary.total} entries
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => void loadLogs(true)}
            disabled={isRefreshing || isDeleteSubmitting}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[0.8rem] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--hover)] disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[0.85rem] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--hover)] print:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Report
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <span className="text-[0.78rem] text-[var(--text-secondary)]">System Time</span>
        <span className="font-mono text-[0.78rem] text-[var(--text-primary)]">{dateTime}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--text-secondary)]">Total</p>
          <p className="mt-1 text-[1.5rem] font-bold">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--text-secondary)]">Added</p>
          <p className="mt-1 text-[1.5rem] font-bold text-[var(--success)]">{summary.added}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--text-secondary)]">Removed</p>
          <p className="mt-1 text-[1.5rem] font-bold text-[var(--danger)]">{summary.removed}</p>
        </div>
        {(["occupied", "maintenance", "cleaning", "available"] as const).map((status) => (
          <div key={status} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--text-secondary)]">{status}</p>
            <p className="mt-1 text-[1.5rem] font-bold" style={{ color: statusColor[status] }}>
              {summary.byStatus[status]}
            </p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-[1.1rem] font-semibold tracking-tight">Audit Entries</h2>
        {isLoading ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[0.9rem] text-[var(--text-secondary)]">
            Loading activity logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
            <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-[0.9rem] font-medium">No activity logs found</p>
            <p className="mt-1 text-[0.8rem]">When schedule entries are added or removed, logs will appear here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[0.78rem] text-[var(--text-secondary)]">
                {selectedCount} selected on this page
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={selectedCount === 0 || isDeleteSubmitting}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[0.72rem] font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={openDeleteSelected}
                  disabled={selectedCount === 0 || isDeleteSubmitting}
                  className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--danger)] transition hover:opacity-90 disabled:opacity-50"
                >
                  Delete Selected
                </button>
                <button
                  type="button"
                  onClick={openDeleteAll}
                  disabled={summary.total === 0 || isDeleteSubmitting}
                  className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Delete All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[0.82rem]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-3 py-3 print:hidden">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible logs"
                        className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-blue)]"
                      />
                    </th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Schedule Period</th>
                    <th className="px-4 py-3">Log ID</th>
                    <th className="px-4 py-3 print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry) => {
                    const isSelected = selectedIds.has(entry.id);
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--hover)]"
                        style={isSelected ? { backgroundColor: "var(--hover)" } : undefined}
                      >
                        <td className="px-3 py-3 print:hidden">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(entry.id)}
                            aria-label={`Select log ${entry.id}`}
                            className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-blue)]"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-[0.74rem] text-[var(--text-secondary)]">
                          {formatTimestamp(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.72rem] font-semibold"
                            style={{
                              color: actionColor[entry.action],
                              backgroundColor: `color-mix(in srgb, ${actionColor[entry.action]} 14%, transparent)`,
                            }}
                          >
                            {actionLabel[entry.action]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">Room {entry.roomNumber}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.78rem] font-medium"
                            style={{
                              color: statusColor[entry.status],
                              backgroundColor: `color-mix(in srgb, ${statusColor[entry.status]} 15%, transparent)`,
                            }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor[entry.status] }} />
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{formatRange(entry.startDate, entry.endDate)}</td>
                        <td className="px-4 py-3 font-mono text-[0.72rem] text-[var(--text-muted)]">{entry.id}</td>
                        <td className="px-4 py-3 print:hidden">
                          <button
                            type="button"
                            onClick={() => openDeleteSingle(entry.id)}
                            disabled={isDeleteSubmitting}
                            className="rounded-md border border-[var(--danger)]/30 px-2.5 py-1 text-[0.72rem] font-medium text-[var(--danger)] transition hover:bg-[var(--danger-soft)] disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore ? (
              <div className="flex items-center justify-center border-t border-[var(--border)] p-3 print:hidden">
                <button
                  type="button"
                  onClick={() => void loadMoreLogs()}
                  disabled={isLoadingMore || isDeleteSubmitting}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-[0.8rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
                >
                  {isLoadingMore ? "Loading..." : `Load More (${PAGE_SIZE})`}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <ConfirmationModal
        isOpen={pendingDelete !== null}
        title={deleteModalTitle}
        description={deleteModalDescription}
        confirmLabel={deleteConfirmLabel}
        cancelLabel="Cancel"
        tone="danger"
        isLoading={isDeleteSubmitting}
        onClose={closeDeleteModal}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </div>
  );
}
