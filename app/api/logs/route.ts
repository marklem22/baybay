import path from "node:path";
import { NextResponse } from "next/server";
import type { ActivityLog, ActivityLogAction, RoomStatus } from "../../lib/roomData";
import { readJsonFile, writeJsonFile } from "../../lib/server/jsonFileStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const logsFilePath = path.join(process.cwd(), "app", "lib", "activityLogs.json");
const allowedStatuses: RoomStatus[] = ["available", "occupied", "maintenance", "cleaning"];
const allowedActions: ActivityLogAction[] = ["schedule_added", "schedule_removed"];

interface LogCreateInput {
  roomNumber?: unknown;
  action?: unknown;
  status?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  createdAt?: unknown;
}

interface LogDeleteInput {
  mode?: unknown;
  ids?: unknown;
}

interface LogsSummary {
  total: number;
  added: number;
  removed: number;
  byStatus: Record<RoomStatus, number>;
}

function isRoomStatus(value: unknown): value is RoomStatus {
  return typeof value === "string" && allowedStatuses.includes(value as RoomStatus);
}

function isLogAction(value: unknown): value is ActivityLogAction {
  return typeof value === "string" && allowedActions.includes(value as ActivityLogAction);
}

function isDateInput(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function parseNonNegativeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function parseDateTimestamp(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return Number.NaN;
  }
  return parsed;
}

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

function buildLogEntry(input: LogCreateInput): ActivityLog | null {
  if (typeof input.roomNumber !== "number" || !Number.isInteger(input.roomNumber)) {
    return null;
  }
  if (!isLogAction(input.action) || !isRoomStatus(input.status)) {
    return null;
  }
  if (!isDateInput(input.startDate) || !isDateInput(input.endDate)) {
    return null;
  }

  const createdAt = isIsoString(input.createdAt) ? input.createdAt : new Date().toISOString();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    roomNumber: input.roomNumber,
    action: input.action,
    status: input.status,
    startDate: input.startDate,
    endDate: input.endDate,
    createdAt,
  };
}

function isActivityLog(value: unknown): value is ActivityLog {
  if (!value || typeof value !== "object") {
    return false;
  }

  const parsed = value as Partial<ActivityLog>;
  return (
    typeof parsed.id === "string" &&
    typeof parsed.roomNumber === "number" &&
    Number.isInteger(parsed.roomNumber) &&
    isLogAction(parsed.action) &&
    isRoomStatus(parsed.status) &&
    isDateInput(parsed.startDate) &&
    isDateInput(parsed.endDate) &&
    isIsoString(parsed.createdAt)
  );
}

async function readLogs(): Promise<ActivityLog[]> {
  const parsed = await readJsonFile<unknown>(logsFilePath);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid activityLogs.json format.");
  }
  return parsed.filter((entry): entry is ActivityLog => isActivityLog(entry));
}

async function writeLogs(logs: ActivityLog[]): Promise<void> {
  await writeJsonFile(logsFilePath, logs);
}

function normalizeIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids = value
    .filter((item): item is string => isNonEmptyString(item))
    .map((item) => item.trim());

  if (ids.length === 0) {
    return [];
  }

  return Array.from(new Set(ids));
}

export async function GET(request: Request) {
  try {
    const logs = await readLogs();
    const searchParams = new URL(request.url).searchParams;

    const rawOffset = searchParams.get("offset");
    const parsedOffset = rawOffset === null ? 0 : parseNonNegativeInteger(rawOffset);
    if (rawOffset !== null && parsedOffset === null) {
      return NextResponse.json({ error: "Invalid offset query parameter." }, { status: 400 });
    }

    const rawLimit = searchParams.get("limit");
    const parsedLimit = rawLimit === null ? null : parsePositiveInteger(rawLimit);
    if (rawLimit !== null && parsedLimit === null) {
      return NextResponse.json({ error: "Invalid limit query parameter." }, { status: 400 });
    }

    const roomNumberParam = searchParams.get("roomNumber");
    const roomNumber = roomNumberParam === null ? null : parsePositiveInteger(roomNumberParam);
    if (roomNumberParam !== null && roomNumber === null) {
      return NextResponse.json({ error: "Invalid roomNumber query parameter." }, { status: 400 });
    }

    const actionParam = searchParams.get("action");
    if (actionParam !== null && !isLogAction(actionParam)) {
      return NextResponse.json({ error: "Invalid action query parameter." }, { status: 400 });
    }

    const statusParam = searchParams.get("status");
    if (statusParam !== null && !isRoomStatus(statusParam)) {
      return NextResponse.json({ error: "Invalid status query parameter." }, { status: 400 });
    }

    const fromTimestamp = parseDateTimestamp(searchParams.get("from"));
    if (Number.isNaN(fromTimestamp)) {
      return NextResponse.json({ error: "Invalid from query parameter." }, { status: 400 });
    }

    const toTimestamp = parseDateTimestamp(searchParams.get("to"));
    if (Number.isNaN(toTimestamp)) {
      return NextResponse.json({ error: "Invalid to query parameter." }, { status: 400 });
    }

    if (fromTimestamp !== null && toTimestamp !== null && fromTimestamp > toTimestamp) {
      return NextResponse.json({ error: "The from date must be before to date." }, { status: 400 });
    }

    const includeSummary =
      searchParams.get("summary") === "1" ||
      searchParams.get("summary") === "true";

    const hasQueryControls =
      rawLimit !== null ||
      rawOffset !== null ||
      roomNumberParam !== null ||
      actionParam !== null ||
      statusParam !== null ||
      searchParams.has("from") ||
      searchParams.has("to") ||
      includeSummary;

    if (!hasQueryControls) {
      return NextResponse.json(logs, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const offset = parsedOffset ?? 0;
    const limit = Math.min(parsedLimit ?? 100, 500);

    let filtered = logs;
    if (roomNumber !== null) {
      filtered = filtered.filter((entry) => entry.roomNumber === roomNumber);
    }
    if (actionParam !== null) {
      filtered = filtered.filter((entry) => entry.action === actionParam);
    }
    if (statusParam !== null) {
      filtered = filtered.filter((entry) => entry.status === statusParam);
    }
    if (fromTimestamp !== null) {
      filtered = filtered.filter((entry) => Date.parse(entry.createdAt) >= fromTimestamp);
    }
    if (toTimestamp !== null) {
      filtered = filtered.filter((entry) => Date.parse(entry.createdAt) <= toTimestamp);
    }

    const total = filtered.length;
    const data = filtered.slice(offset, offset + limit);

    return NextResponse.json(
      {
        data,
        meta: {
          total,
          offset,
          limit,
          hasMore: offset + data.length < total,
        },
        ...(includeSummary ? { summary: buildSummary(filtered) } : {}),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to read activity logs", error);
    return NextResponse.json({ error: "Failed to load activity logs." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { logs?: unknown };
    const rawLogs = body.logs;

    if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
      return NextResponse.json({ error: "Request must include a non-empty logs array." }, { status: 400 });
    }

    const normalized = rawLogs
      .map((entry) => buildLogEntry((entry ?? {}) as LogCreateInput))
      .filter((entry): entry is ActivityLog => entry !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (normalized.length === 0) {
      return NextResponse.json({ error: "No valid log entries were provided." }, { status: 400 });
    }

    const existing = await readLogs();
    const nextLogs = [...normalized, ...existing];
    await writeLogs(nextLogs);

    return NextResponse.json(normalized, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to write activity logs", error);
    return NextResponse.json({ error: "Failed to save activity logs." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as LogDeleteInput;
    const mode = body.mode;

    if (mode !== "all" && mode !== "selected") {
      return NextResponse.json({ error: "Invalid delete mode." }, { status: 400 });
    }

    const existing = await readLogs();

    if (mode === "all") {
      const deletedCount = existing.length;
      if (deletedCount > 0) {
        await writeLogs([]);
      }

      return NextResponse.json(
        {
          success: true,
          deletedCount,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const ids = normalizeIds(body.ids);
    if (ids === null || ids.length === 0) {
      return NextResponse.json({ error: "A non-empty ids array is required." }, { status: 400 });
    }

    const idsSet = new Set(ids);
    const nextLogs = existing.filter((entry) => !idsSet.has(entry.id));
    const deletedCount = existing.length - nextLogs.length;

    if (deletedCount === 0) {
      return NextResponse.json({ error: "No matching logs were found." }, { status: 404 });
    }

    await writeLogs(nextLogs);

    return NextResponse.json(
      {
        success: true,
        deletedCount,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to bulk delete activity logs", error);
    return NextResponse.json({ error: "Failed to delete activity logs." }, { status: 500 });
  }
}
