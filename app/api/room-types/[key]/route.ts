import path from "node:path";
import { NextResponse } from "next/server";
import type { Room, RoomTypeWithUsage } from "../../../lib/roomData";
import { readJsonFile } from "../../../lib/server/jsonFileStore";
import {
  isValidRoomTypeKey,
  normalizeRoomTypeKey,
  readRoomTypes,
  writeRoomTypes,
} from "../../../lib/server/roomTypesStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hutsFilePath = path.join(process.cwd(), "app", "lib", "huts.json");

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

function countUsage(rooms: Room[], roomTypeKey: string): number {
  return rooms.filter((room) => room.type === roomTypeKey).length;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key: keyParam } = await context.params;
    const key = normalizeRoomTypeKey(keyParam);

    if (!isValidRoomTypeKey(key)) {
      return NextResponse.json({ error: "Invalid room type key." }, { status: 400 });
    }

    const body = (await request.json()) as {
      label?: unknown;
      description?: unknown;
      defaultCapacity?: unknown;
      amenities?: unknown;
      isActive?: unknown;
    };

    if (body.label !== undefined && (typeof body.label !== "string" || body.label.trim().length === 0)) {
      return NextResponse.json({ error: "Label must be a non-empty string." }, { status: 400 });
    }

    if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
      return NextResponse.json({ error: "Description must be a string." }, { status: 400 });
    }

    const parsedDefaultCapacity =
      body.defaultCapacity === undefined ? undefined : parsePositiveInteger(body.defaultCapacity);
    if (body.defaultCapacity !== undefined && parsedDefaultCapacity === null) {
      return NextResponse.json({ error: "Default capacity must be a positive whole number." }, { status: 400 });
    }
    const nextDefaultCapacity =
      parsedDefaultCapacity === undefined ? undefined : (parsedDefaultCapacity as number);

    if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean." }, { status: 400 });
    }

    const roomTypes = await readRoomTypes();
    const index = roomTypes.findIndex((entry) => entry.key === key);
    if (index === -1) {
      return NextResponse.json({ error: "Room type not found." }, { status: 404 });
    }

    const current = roomTypes[index];
    const updated = {
      ...current,
      ...(body.label !== undefined ? { label: body.label.trim() } : {}),
      ...(body.description !== undefined
        ? {
            description:
              typeof body.description === "string" && body.description.trim().length > 0
                ? body.description.trim()
                : undefined,
          }
        : {}),
      ...(nextDefaultCapacity !== undefined ? { defaultCapacity: nextDefaultCapacity } : {}),
      ...(body.amenities !== undefined ? { amenities: parseAmenities(body.amenities) } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      updatedAt: new Date().toISOString(),
    };

    const next = [...roomTypes];
    next[index] = updated;
    await writeRoomTypes(next);

    const usageCount = countUsage(await readHuts(), updated.key);
    const payload: RoomTypeWithUsage = { ...updated, usageCount };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to update room type", error);
    return NextResponse.json({ error: "Failed to update room type." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key: keyParam } = await context.params;
    const key = normalizeRoomTypeKey(keyParam);

    if (!isValidRoomTypeKey(key)) {
      return NextResponse.json({ error: "Invalid room type key." }, { status: 400 });
    }

    const roomTypes = await readRoomTypes();
    const target = roomTypes.find((entry) => entry.key === key);
    if (!target) {
      return NextResponse.json({ error: "Room type not found." }, { status: 404 });
    }

    if (roomTypes.length <= 1) {
      return NextResponse.json(
        { error: "At least one room type must remain in the system." },
        { status: 400 },
      );
    }

    const usageCount = countUsage(await readHuts(), key);
    if (usageCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a room type that is assigned to rooms.", usageCount },
        { status: 409 },
      );
    }

    const next = roomTypes.filter((entry) => entry.key !== key);
    await writeRoomTypes(next);

    return NextResponse.json(
      {
        success: true,
        deletedKey: key,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to delete room type", error);
    return NextResponse.json({ error: "Failed to delete room type." }, { status: 500 });
  }
}
