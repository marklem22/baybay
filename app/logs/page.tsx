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

interface ArchivedLog extends ActivityLog {
  archivedAt: string;
}

interface ArchiveResponse {
  data: ArchivedLog[];
  total: number;
}

type PendingAction =
  | { type: "archive-single"; ids: [string] }
  | { type: "archive-selected"; ids: string[] }
  | { type: "archive-all" }
  | { type: "restore-single"; ids: [string] }
  | { type: "restore-selected"; ids: string[] }
  | { type: "restore-all" }
  | { type: "perma-delete-single"; ids: [string] }
  | { type: "perma-delete-selected"; ids: string[] }
  | { type: "perma-delete-all" };

type ActiveTab = "logs" | "archived";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("logs");

  // --- Active Logs state ---
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState<LogsSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Archived Logs state ---
  const [archivedLogs, setArchivedLogs] = useState<ArchivedLog[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<Set<string>>(new Set());

  // --- Modal state ---
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  // ---- Load active logs ----
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
      if (!response.ok) throw new Error(`Load failed with status ${response.status}`);

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
    if (!hasMore || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const response = await fetch(`/api/logs?limit=${PAGE_SIZE}&offset=${nextOffset}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Load failed with status ${response.status}`);

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

  // ---- Load archived logs ----
  const loadArchive = useCallback(async () => {
    try {
      setIsLoadingArchive(true);
      const response = await fetch("/api/logs/archive", { cache: "no-store" });
      if (!response.ok) throw new Error(`Load failed with status ${response.status}`);
      const payload = (await response.json()) as ArchiveResponse;
      setArchivedLogs(Array.isArray(payload.data) ? payload.data : []);
      setSelectedArchiveIds(new Set());
    } catch (error) {
      console.error("Failed to load archived logs", error);
      setToast("Could not load archived logs.");
    } finally {
      setIsLoadingArchive(false);
    }
  }, [setToast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (activeTab === "archived") {
      void loadArchive();
    }
  }, [activeTab, loadArchive]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.total, logs.length]);

  const formatRange = (startDate: string, endDate: string) => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    if (startDate === endDate) return start.toLocaleDateString("en-US", options);
    return `${start.toLocaleDateString("en-US", options)} to ${end.toLocaleDateString("en-US", options)}`;
  };

  const formatTimestamp = (ts: string) =>
    new Date(ts).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  // ---- Selection helpers (active logs) ----
  const selectedCount = selectedIds.size;
  const allVisibleSelected = logs.length > 0 && logs.every((e) => selectedIds.has(e.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((c) => {
      const n = new Set(c);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelectedIds((c) => {
      const n = new Set(c);
      if (allVisibleSelected) {
        logs.forEach((e) => n.delete(e.id));
      } else {
        logs.forEach((e) => n.add(e.id));
      }
      return n;
    });
  };

  // ---- Selection helpers (archived) ----
  const selectedArchiveCount = selectedArchiveIds.size;
  const allArchivedSelected = archivedLogs.length > 0 && archivedLogs.every((e) => selectedArchiveIds.has(e.id));

  const toggleArchiveSelect = (id: string) => {
    setSelectedArchiveIds((c) => {
      const n = new Set(c);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleSelectAllArchived = () => {
    setSelectedArchiveIds((c) => {
      const n = new Set(c);
      if (allArchivedSelected) {
        archivedLogs.forEach((e) => n.delete(e.id));
      } else {
        archivedLogs.forEach((e) => n.add(e.id));
      }
      return n;
    });
  };

  // ---- Action target count ----
  const actionTargetCount = useMemo(() => {
    if (!pendingAction) return 0;
    if (pendingAction.type.endsWith("-all")) {
      if (pendingAction.type.startsWith("archive")) return summary.total;
      return archivedLogs.length;
    }
    return (pendingAction as { ids: string[] }).ids.length;
  }, [pendingAction, summary.total, archivedLogs.length]);

  // ---- Confirmation modal labels ----
  const modalInfo = useMemo(() => {
    if (!pendingAction) return { title: "", description: "", confirmLabel: "", tone: "danger" as const };
    const count = actionTargetCount;
    const countStr = formatEntryCount(count);

    if (pendingAction.type.startsWith("archive")) {
      return {
        title: pendingAction.type === "archive-all" ? "Archive all logs?" : pendingAction.type === "archive-selected" ? `Archive ${countStr}?` : "Archive this log entry?",
        description: `${countStr} will be moved to the archive. You can restore them later.`,
        confirmLabel: pendingAction.type === "archive-all" ? "Archive All" : pendingAction.type === "archive-selected" ? "Archive Selected" : "Archive",
        tone: "primary" as const,
      };
    }
    if (pendingAction.type.startsWith("restore")) {
      return {
        title: pendingAction.type === "restore-all" ? "Restore all archived logs?" : pendingAction.type === "restore-selected" ? `Restore ${countStr}?` : "Restore this log entry?",
        description: `${countStr} will be moved back to active logs.`,
        confirmLabel: pendingAction.type === "restore-all" ? "Restore All" : pendingAction.type === "restore-selected" ? "Restore Selected" : "Restore",
        tone: "primary" as const,
      };
    }
    // perma-delete
    return {
      title: pendingAction.type === "perma-delete-all" ? "Permanently delete all archived logs?" : pendingAction.type === "perma-delete-selected" ? `Permanently delete ${countStr}?` : "Permanently delete this log?",
      description: `This action cannot be undone. ${countStr} will be permanently removed.`,
      confirmLabel: pendingAction.type === "perma-delete-all" ? "Delete All" : pendingAction.type === "perma-delete-selected" ? "Delete Selected" : "Delete",
      tone: "danger" as const,
    };
  }, [pendingAction, actionTargetCount]);

  const closeModal = () => {
    if (isActionSubmitting) return;
    setPendingAction(null);
  };

  // ---- Execute confirmed action ----
  const handleConfirm = async () => {
    if (!pendingAction || actionTargetCount === 0) {
      setPendingAction(null);
      return;
    }

    setIsActionSubmitting(true);
    try {
      const actionType = pendingAction.type;

      if (actionType.startsWith("archive")) {
        // Archive logs: DELETE /api/logs
        const requestBody =
          actionType === "archive-all"
            ? { mode: "all" }
            : { mode: "selected", ids: (pendingAction as { ids: string[] }).ids };

        const response = await fetch("/api/logs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!response.ok) throw new Error("Archive failed");

        setToast(`Archived ${formatEntryCount(actionTargetCount)}.`);
        setSelectedIds(new Set());
        await loadLogs(true);
      } else if (actionType.startsWith("restore")) {
        // Restore: POST /api/logs/archive
        const requestBody =
          actionType === "restore-all"
            ? { mode: "all" }
            : { mode: "selected", ids: (pendingAction as { ids: string[] }).ids };

        const response = await fetch("/api/logs/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!response.ok) throw new Error("Restore failed");

        setToast(`Restored ${formatEntryCount(actionTargetCount)}.`);
        setSelectedArchiveIds(new Set());
        await loadArchive();
        // Also refresh active logs since items were restored
        await loadLogs(true);
      } else {
        // Permanent delete: DELETE /api/logs/archive
        const requestBody =
          actionType === "perma-delete-all"
            ? { mode: "all" }
            : { mode: "selected", ids: (pendingAction as { ids: string[] }).ids };

        const response = await fetch("/api/logs/archive", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (!response.ok) throw new Error("Permanent delete failed");

        setToast(`Permanently deleted ${formatEntryCount(actionTargetCount)}.`);
        setSelectedArchiveIds(new Set());
        await loadArchive();
      }

      setPendingAction(null);
    } catch (error) {
      console.error("Action failed", error);
      setToast("Operation failed. Please try again.");
    } finally {
      setIsActionSubmitting(false);
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
            onClick={() => {
              if (activeTab === "logs") void loadLogs(true);
              else void loadArchive();
            }}
            disabled={isRefreshing || isActionSubmitting || isLoadingArchive}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[0.8rem] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--hover)] disabled:opacity-50"
          >
            {isRefreshing || isLoadingArchive ? "Refreshing..." : "Refresh"}
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-1 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`flex-1 rounded-md px-4 py-2 text-[0.85rem] font-medium transition-all ${
            activeTab === "logs"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Active Logs ({summary.total})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("archived")}
          className={`flex-1 rounded-md px-4 py-2 text-[0.85rem] font-medium transition-all ${
            activeTab === "archived"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Archived ({archivedLogs.length})
        </button>
      </div>

      {/* ======== ACTIVE LOGS TAB ======== */}
      {activeTab === "logs" && (
        <>
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
                {/* Toolbar */}
                <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[0.78rem] text-[var(--text-secondary)]">
                    {selectedCount} selected
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      disabled={selectedCount === 0 || isActionSubmitting}
                      className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[0.72rem] font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCount > 0) setPendingAction({ type: "archive-selected", ids: Array.from(selectedIds) });
                      }}
                      disabled={selectedCount === 0 || isActionSubmitting}
                      className="rounded-md border border-[var(--warning)]/40 bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--warning)] transition hover:opacity-90 disabled:opacity-50"
                    >
                      Archive Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (summary.total > 0) setPendingAction({ type: "archive-all" });
                      }}
                      disabled={summary.total === 0 || isActionSubmitting}
                      className="rounded-md border border-[var(--warning)]/40 bg-[var(--warning)] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      Archive All
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[0.82rem]">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        <th className="px-3 py-3 print:hidden">
                          <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} aria-label="Select all" className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-blue)]" />
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
                          <tr key={entry.id} className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--hover)]" style={isSelected ? { backgroundColor: "var(--hover)" } : undefined}>
                            <td className="px-3 py-3 print:hidden">
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(entry.id)} className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-blue)]" />
                            </td>
                            <td className="px-4 py-3 font-mono text-[0.74rem] text-[var(--text-secondary)]">{formatTimestamp(entry.createdAt)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.72rem] font-semibold" style={{ color: actionColor[entry.action], backgroundColor: `color-mix(in srgb, ${actionColor[entry.action]} 14%, transparent)` }}>
                                {actionLabel[entry.action]}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium">Room {entry.roomNumber}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.78rem] font-medium" style={{ color: statusColor[entry.status], backgroundColor: `color-mix(in srgb, ${statusColor[entry.status]} 15%, transparent)` }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor[entry.status] }} />
                                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">{formatRange(entry.startDate, entry.endDate)}</td>
                            <td className="px-4 py-3 font-mono text-[0.72rem] text-[var(--text-muted)]">{entry.id}</td>
                            <td className="px-4 py-3 print:hidden">
                              <button
                                type="button"
                                onClick={() => setPendingAction({ type: "archive-single", ids: [entry.id] })}
                                disabled={isActionSubmitting}
                                className="rounded-md border border-[var(--warning)]/30 px-2.5 py-1 text-[0.72rem] font-medium text-[var(--warning)] transition hover:bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] disabled:opacity-50"
                              >
                                Archive
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {hasMore && (
                  <div className="flex items-center justify-center border-t border-[var(--border)] p-3 print:hidden">
                    <button
                      type="button"
                      onClick={() => void loadMoreLogs()}
                      disabled={isLoadingMore || isActionSubmitting}
                      className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-[0.8rem] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
                    >
                      {isLoadingMore ? "Loading..." : `Load More (${PAGE_SIZE})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* ======== ARCHIVED TAB ======== */}
      {activeTab === "archived" && (
        <section>
          <h2 className="mb-3 text-[1.1rem] font-semibold tracking-tight">Archived Entries</h2>
          {isLoadingArchive ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[0.9rem] text-[var(--text-secondary)]">
              Loading archived logs...
            </div>
          ) : archivedLogs.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-secondary)]">
              <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
              <p className="text-[0.9rem] font-medium">Archive is empty</p>
              <p className="mt-1 text-[0.8rem]">Archived log entries will appear here.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
              {/* Toolbar */}
              <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[0.78rem] text-[var(--text-secondary)]">
                  {selectedArchiveCount} selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedArchiveIds(new Set())}
                    disabled={selectedArchiveCount === 0 || isActionSubmitting}
                    className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[0.72rem] font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedArchiveCount > 0) setPendingAction({ type: "restore-selected", ids: Array.from(selectedArchiveIds) });
                    }}
                    disabled={selectedArchiveCount === 0 || isActionSubmitting}
                    className="rounded-md border border-[var(--accent-blue)]/40 bg-[color-mix(in_srgb,var(--accent-blue)_12%,transparent)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--accent-blue)] transition hover:opacity-90 disabled:opacity-50"
                  >
                    Restore Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (archivedLogs.length > 0) setPendingAction({ type: "restore-all" });
                    }}
                    disabled={archivedLogs.length === 0 || isActionSubmitting}
                    className="rounded-md border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    Restore All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedArchiveCount > 0) setPendingAction({ type: "perma-delete-selected", ids: Array.from(selectedArchiveIds) });
                    }}
                    disabled={selectedArchiveCount === 0 || isActionSubmitting}
                    className="rounded-md border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-1.5 text-[0.72rem] font-semibold text-[var(--danger)] transition hover:opacity-90 disabled:opacity-50"
                  >
                    Delete Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (archivedLogs.length > 0) setPendingAction({ type: "perma-delete-all" });
                    }}
                    disabled={archivedLogs.length === 0 || isActionSubmitting}
                    className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)] px-3 py-1.5 text-[0.72rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    Delete All
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[0.82rem]">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      <th className="px-3 py-3 print:hidden">
                        <input type="checkbox" checked={allArchivedSelected} onChange={toggleSelectAllArchived} aria-label="Select all archived" className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-blue)]" />
                      </th>
                      <th className="px-4 py-3">Archived At</th>
                      <th className="px-4 py-3">Activity</th>
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Schedule Period</th>
                      <th className="px-4 py-3 print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedLogs.map((entry) => {
                      const isSelected = selectedArchiveIds.has(entry.id);
                      return (
                        <tr key={entry.id} className="border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--hover)]" style={isSelected ? { backgroundColor: "var(--hover)" } : undefined}>
                          <td className="px-3 py-3 print:hidden">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleArchiveSelect(entry.id)} className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-blue)]" />
                          </td>
                          <td className="px-4 py-3 font-mono text-[0.74rem] text-[var(--text-secondary)]">{formatTimestamp(entry.archivedAt)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.72rem] font-semibold" style={{ color: actionColor[entry.action], backgroundColor: `color-mix(in srgb, ${actionColor[entry.action]} 14%, transparent)` }}>
                              {actionLabel[entry.action]}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">Room {entry.roomNumber}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.78rem] font-medium" style={{ color: statusColor[entry.status], backgroundColor: `color-mix(in srgb, ${statusColor[entry.status]} 15%, transparent)` }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor[entry.status] }} />
                              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">{formatRange(entry.startDate, entry.endDate)}</td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPendingAction({ type: "restore-single", ids: [entry.id] })}
                                disabled={isActionSubmitting}
                                className="rounded-md border border-[var(--accent-blue)]/30 px-2.5 py-1 text-[0.72rem] font-medium text-[var(--accent-blue)] transition hover:bg-[color-mix(in_srgb,var(--accent-blue)_12%,transparent)] disabled:opacity-50"
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingAction({ type: "perma-delete-single", ids: [entry.id] })}
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
      )}

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
