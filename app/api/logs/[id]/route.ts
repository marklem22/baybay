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

async function readLogs(): Promise<ActivityLog[]> {
  const parsed = await readJsonFile<unknown>(logsFilePath);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid activityLogs.json format.");
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Log id is required." }, { status: 400 });
    }

    const logs = await readLogs();
    const entry = logs.find((e) => e.id === id);
    if (!entry) {
      return NextResponse.json({ error: "Log not found." }, { status: 404 });
    }

    const nextLogs = logs.filter((e) => e.id !== id);
    const archive = await readArchive();
    const archivedEntry: ArchivedLog = { ...entry, archivedAt: new Date().toISOString() };
    await writeArchive([archivedEntry, ...archive]);
    await writeLogs(nextLogs);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to archive activity log", error);
    return NextResponse.json({ error: "Failed to archive activity log." }, { status: 500 });
  }
}


