import path from "node:path";
import { NextResponse } from "next/server";
import type { ActivityLog } from "../../../lib/roomData";
import { readJsonFile, writeJsonFile } from "../../../lib/server/jsonFileStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const logsFilePath = path.join(process.cwd(), "app", "lib", "activityLogs.json");

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
    const nextLogs = logs.filter((entry) => entry.id !== id);

    if (nextLogs.length === logs.length) {
      return NextResponse.json({ error: "Log not found." }, { status: 404 });
    }

    await writeLogs(nextLogs);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete activity log", error);
    return NextResponse.json({ error: "Failed to delete activity log." }, { status: 500 });
  }
}


