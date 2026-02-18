import path from "node:path";
import { NextResponse } from "next/server";
import type { Room, RoomTypeRecord, RoomTypeWithUsage } from "../../lib/roomData";
import { readJsonFile } from "../../lib/server/jsonFileStore";
import {
  isValidRoomTypeKey,
  normalizeRoomTypeKey,
  readRoomTypes,
  writeRoomTypes,
} from "../../lib/server/roomTypesStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hutsFilePath = path.join(process.cwd(), "app", "lib", "huts.json");

function parseBooleanQuery(value: string | null): boolean | null {
  if (value === null) return null;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
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

function parseAmenities(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
  }

  return [];
}

async function readHuts(): Promise<Room[]> {
  const parsed = await readJsonFile<unknown>(hutsFilePath);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as Room[];
}

function withUsage(roomTypes: RoomTypeRecord[], huts: Room[]): RoomTypeWithUsage[] {
  const usageMap = huts.reduce<Map<string, number>>((acc, room) => {
    const current = acc.get(room.type) ?? 0;
    acc.set(room.type, current + 1);
    return acc;
  }, new Map());

  return roomTypes.map((roomType) => ({
    ...roomType,
    usageCount: usageMap.get(roomType.key) ?? 0,
  }));
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const activeParam = searchParams.get("active");
    const usageParam = searchParams.get("usage");

    const activeFilter = parseBooleanQuery(activeParam);
    if (activeParam !== null && activeFilter === null) {
      return NextResponse.json({ error: "Invalid active query parameter." }, { status: 400 });
    }

    const includeUsage = usageParam === null ? true : parseBooleanQuery(usageParam);
    if (usageParam !== null && includeUsage === null) {
      return NextResponse.json({ error: "Invalid usage query parameter." }, { status: 400 });
    }

    let roomTypes = await readRoomTypes();
    if (activeFilter !== null) {
      roomTypes = roomTypes.filter((entry) => entry.isActive === activeFilter);
    }

    if (!includeUsage) {
      return NextResponse.json(roomTypes, { headers: { "Cache-Control": "no-store" } });
    }

    const huts = await readHuts();
    return NextResponse.json(withUsage(roomTypes, huts), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load room types", error);
    return NextResponse.json({ error: "Failed to load room types." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      key?: unknown;
      label?: unknown;
      description?: unknown;
      defaultCapacity?: unknown;
      amenities?: unknown;
      isActive?: unknown;
    };

    if (typeof body.label !== "string" || body.label.trim().length === 0) {
      return NextResponse.json({ error: "Room type label is required." }, { status: 400 });
    }

    const normalizedLabel = body.label.trim();
    const rawKey = typeof body.key === "string" && body.key.trim().length > 0
      ? body.key
      : normalizedLabel;
    const key = normalizeRoomTypeKey(rawKey);

    if (!isValidRoomTypeKey(key)) {
      return NextResponse.json(
        { error: "Room type key must use lowercase letters, numbers, and hyphens only." },
        { status: 400 },
      );
    }

    const parsedDefaultCapacity =
      body.defaultCapacity === undefined ? 1 : parsePositiveInteger(body.defaultCapacity);
    if (parsedDefaultCapacity === null) {
      return NextResponse.json({ error: "Default capacity must be a positive whole number." }, { status: 400 });
    }

    if (body.description !== undefined && typeof body.description !== "string") {
      return NextResponse.json({ error: "Description must be a string." }, { status: 400 });
    }

    if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean." }, { status: 400 });
    }

    const roomTypes = await readRoomTypes();
    if (roomTypes.some((entry) => entry.key === key)) {
      return NextResponse.json({ error: "Room type key already exists." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const created: RoomTypeRecord = {
      key,
      label: normalizedLabel,
      description: typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : undefined,
      defaultCapacity: parsedDefaultCapacity,
      amenities: parseAmenities(body.amenities),
      isActive: body.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await writeRoomTypes([...roomTypes, created]);

    const createdWithUsage: RoomTypeWithUsage = {
      ...created,
      usageCount: 0,
    };

    return NextResponse.json(createdWithUsage, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to create room type", error);
    return NextResponse.json({ error: "Failed to create room type." }, { status: 500 });
  }
}
