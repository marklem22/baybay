import path from "node:path";
import { NextResponse } from "next/server";
import type { RoomStatus, StatusEntry } from "../../lib/roomData";
import { readJsonFile, writeJsonFile } from "../../lib/server/jsonFileStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SchedulesMap = Record<string, StatusEntry[]>;

const schedulesFilePath = path.join(process.cwd(), "app", "lib", "schedules.json");
const allowedStatuses: RoomStatus[] = ["available", "occupied", "maintenance", "cleaning"];

function isDateInput(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isBookerName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 120
  );
}

function isCheckoutTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function isStatusEntry(value: unknown): value is StatusEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<StatusEntry>;

  return (
    typeof entry.id === "string" &&
    typeof entry.status === "string" &&
    allowedStatuses.includes(entry.status as RoomStatus) &&
    isDateInput(entry.startDate) &&
    isDateInput(entry.endDate) &&
    (entry.bookedBy === undefined || isBookerName(entry.bookedBy)) &&
    (entry.checkoutTime === undefined || isCheckoutTime(entry.checkoutTime))
  );
}

function normalizeEntries(entries: StatusEntry[]): StatusEntry[] {
  const sanitized = entries.map((entry) => {
    const trimmedBooker = typeof entry.bookedBy === "string" ? entry.bookedBy.trim() : "";
    return {
      ...entry,
      ...(entry.status === "occupied" && trimmedBooker.length > 0
        ? { bookedBy: trimmedBooker }
        : {}),
      ...(entry.checkoutTime ? { checkoutTime: entry.checkoutTime } : {}),
    };
  });

  return [...sanitized].sort((a, b) => {
    const dateCompare = a.startDate.localeCompare(b.startDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return a.id.localeCompare(b.id);
  });
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

async function readSchedules(): Promise<SchedulesMap> {
  const parsed = await readJsonFile<unknown>(schedulesFilePath);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid schedules.json format.");
  }

  const result: SchedulesMap = {};

  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const validEntries = value.filter((entry): entry is StatusEntry => isStatusEntry(entry));
    result[key] = validEntries;
  }

  return result;
}

async function writeSchedules(schedules: SchedulesMap): Promise<void> {
  await writeJsonFile(schedulesFilePath, schedules);
}

export async function GET(request: Request) {
  try {
    const schedules = await readSchedules();
    const roomNumberParam = new URL(request.url).searchParams.get("roomNumber");

    if (roomNumberParam !== null) {
      const roomNumber = parsePositiveInteger(roomNumberParam);
      if (roomNumber === null) {
        return NextResponse.json({ error: "Invalid roomNumber query parameter." }, { status: 400 });
      }

      const entries = schedules[String(roomNumber)] ?? [];
      return NextResponse.json(
        { roomNumber, entries },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(schedules, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to read schedules.json", error);
    return NextResponse.json({ error: "Failed to load schedules." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      roomNumber?: unknown;
      entries?: unknown;
    };

    if (typeof body.roomNumber !== "number" || !Number.isInteger(body.roomNumber)) {
      return NextResponse.json({ error: "Invalid room number." }, { status: 400 });
    }

    if (!Array.isArray(body.entries)) {
      return NextResponse.json({ error: "Entries must be an array." }, { status: 400 });
    }

    const isValid = body.entries.every((entry) => isStatusEntry(entry));
    if (!isValid) {
      return NextResponse.json({ error: "Invalid schedule entry payload." }, { status: 400 });
    }

    const schedules = { ...(await readSchedules()) };
    const key = String(body.roomNumber);
    const nextEntries = normalizeEntries(body.entries as StatusEntry[]);

    if (nextEntries.length === 0) {
      delete schedules[key];
    } else {
      schedules[key] = nextEntries;
    }

    await writeSchedules(schedules);

    return NextResponse.json(
      { roomNumber: body.roomNumber, entries: nextEntries },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to update schedules.json", error);
    return NextResponse.json({ error: "Failed to save schedules." }, { status: 500 });
  }
}
