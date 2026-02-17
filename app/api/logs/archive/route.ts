import path from "node:path";
import { NextResponse } from "next/server";
import type { ActivityLog } from "../../../lib/roomData";
import { readJsonFile, writeJsonFile } from "../../../lib/server/jsonFileStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const logsFilePath = path.join(process.cwd(), "app", "lib", "activityLogs.json");
const archiveFilePath = path.join(process.cwd(), "app", "lib", "archivedLogs.json");

interface ArchivedLog extends ActivityLog {
  archivedAt: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function readLogs(): Promise<ActivityLog[]> {
  const parsed = await readJsonFile<unknown>(logsFilePath);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as ActivityLog[];
}

async function writeLogs(logs: ActivityLog[]): Promise<void> {
  await writeJsonFile(logsFilePath, logs);
}

async function readArchive(): Promise<ArchivedLog[]> {
  const parsed = await readJsonFile<unknown>(archiveFilePath);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as ArchivedLog[];
}

async function writeArchive(logs: ArchivedLog[]): Promise<void> {
  await writeJsonFile(archiveFilePath, logs);
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

/** GET /api/logs/archive - list all archived logs */
export async function GET() {
  try {
    const archive = await readArchive();
    return NextResponse.json(
      { data: archive, total: archive.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to read archived logs", error);
    return NextResponse.json({ error: "Failed to load archived logs." }, { status: 500 });
  }
}

/** POST /api/logs/archive - restore archived logs back to active */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { mode?: string; ids?: unknown };

    if (body.mode !== "all" && body.mode !== "selected") {
      return NextResponse.json({ error: "Invalid restore mode." }, { status: 400 });
    }

    const archive = await readArchive();
    const existingLogs = await readLogs();

    if (body.mode === "all") {
      const restoredCount = archive.length;
      if (restoredCount > 0) {
        // Strip archivedAt and prepend to main logs
        const restored: ActivityLog[] = archive.map(({ archivedAt, ...rest }) => rest);
        await writeLogs([...restored, ...existingLogs]);
        await writeArchive([]);
      }
      return NextResponse.json(
        { success: true, restoredCount },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const ids = normalizeIds(body.ids);
    if (ids === null || ids.length === 0) {
      return NextResponse.json({ error: "A non-empty ids array is required." }, { status: 400 });
    }

    const idsSet = new Set(ids);
    const toRestore = archive.filter((entry) => idsSet.has(entry.id));
    const remaining = archive.filter((entry) => !idsSet.has(entry.id));
    const restoredCount = toRestore.length;

    if (restoredCount === 0) {
      return NextResponse.json({ error: "No matching archived logs found." }, { status: 404 });
    }

    const restored: ActivityLog[] = toRestore.map(({ archivedAt, ...rest }) => rest);
    await writeLogs([...restored, ...existingLogs]);
    await writeArchive(remaining);

    return NextResponse.json(
      { success: true, restoredCount },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to restore archived logs", error);
    return NextResponse.json({ error: "Failed to restore archived logs." }, { status: 500 });
  }
}

/** DELETE /api/logs/archive - permanently delete archived logs */
export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { mode?: string; ids?: unknown };

    if (body.mode !== "all" && body.mode !== "selected") {
      return NextResponse.json({ error: "Invalid delete mode." }, { status: 400 });
    }

    const archive = await readArchive();

    if (body.mode === "all") {
      const deletedCount = archive.length;
      if (deletedCount > 0) {
        await writeArchive([]);
      }
      return NextResponse.json(
        { success: true, deletedCount },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const ids = normalizeIds(body.ids);
    if (ids === null || ids.length === 0) {
      return NextResponse.json({ error: "A non-empty ids array is required." }, { status: 400 });
    }

    const idsSet = new Set(ids);
    const remaining = archive.filter((entry) => !idsSet.has(entry.id));
    const deletedCount = archive.length - remaining.length;

    if (deletedCount === 0) {
      return NextResponse.json({ error: "No matching archived logs found." }, { status: 404 });
    }

    await writeArchive(remaining);

    return NextResponse.json(
      { success: true, deletedCount },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to permanently delete archived logs", error);
    return NextResponse.json({ error: "Failed to delete archived logs." }, { status: 500 });
  }
}
