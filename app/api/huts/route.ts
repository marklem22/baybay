import path from "node:path";
import { NextResponse } from "next/server";
import type { Room, RoomStatus, RoomType } from "../../lib/roomData";
import { readJsonFile, writeJsonFile } from "../../lib/server/jsonFileStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hutsFilePath = path.join(process.cwd(), "app", "lib", "huts.json");
const allowedStatuses: RoomStatus[] = ["available", "occupied", "maintenance", "cleaning"];
const allowedTypes: RoomType[] = ["single", "double", "suite", "deluxe"];

function isRoomStatus(value: unknown): value is RoomStatus {
  return typeof value === "string" && allowedStatuses.includes(value as RoomStatus);
}

function isRoomType(value: unknown): value is RoomType {
  return typeof value === "string" && allowedTypes.includes(value as RoomType);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parsePositiveInteger(value: unknown): number | null {
  if (isPositiveInteger(value)) {
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

async function readHuts(): Promise<Room[]> {
  const parsed = await readJsonFile<unknown>(hutsFilePath);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid huts.json format.");
  }

  return parsed as Room[];
}

async function writeHuts(huts: Room[]): Promise<void> {
  await writeJsonFile(hutsFilePath, huts);
}

export async function GET(request: Request) {
  try {
    const huts = await readHuts();
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

    const statusFilterRaw = searchParams.get("status");
    if (statusFilterRaw !== null && !isRoomStatus(statusFilterRaw)) {
      return NextResponse.json({ error: "Invalid status query parameter." }, { status: 400 });
    }

    const typeFilterRaw = searchParams.get("type");
    if (typeFilterRaw !== null && !isRoomType(typeFilterRaw)) {
      return NextResponse.json({ error: "Invalid type query parameter." }, { status: 400 });
    }

    const floorFilterRaw = searchParams.get("floor");
    const floorFilter = floorFilterRaw === null ? null : parsePositiveInteger(floorFilterRaw);
    if (floorFilterRaw !== null && floorFilter === null) {
      return NextResponse.json({ error: "Invalid floor query parameter." }, { status: 400 });
    }

    const roomNumberRaw = searchParams.get("number");
    const roomNumberFilter = roomNumberRaw === null ? null : parsePositiveInteger(roomNumberRaw);
    if (roomNumberRaw !== null && roomNumberFilter === null) {
      return NextResponse.json({ error: "Invalid number query parameter." }, { status: 400 });
    }

    const includeSummary =
      searchParams.get("summary") === "1" ||
      searchParams.get("summary") === "true";

    const limit = parsedLimit === null ? null : Math.min(parsedLimit, 500);
    const offset = parsedOffset ?? 0;
    let filtered = huts;

    if (statusFilterRaw) {
      filtered = filtered.filter((room) => room.status === statusFilterRaw);
    }

    if (typeFilterRaw) {
      filtered = filtered.filter((room) => room.type === typeFilterRaw);
    }

    if (floorFilter !== null) {
      filtered = filtered.filter((room) => room.floor === floorFilter);
    }

    if (roomNumberFilter !== null) {
      filtered = filtered.filter((room) => room.number === roomNumberFilter);
    }

    if (includeSummary) {
      const maxNumber = filtered.reduce((max, room) => Math.max(max, room.number), 0);
      return NextResponse.json(
        {
          total: filtered.length,
          maxNumber,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const shouldPaginate =
      limit !== null ||
      offset > 0 ||
      statusFilterRaw !== null ||
      typeFilterRaw !== null ||
      floorFilter !== null ||
      roomNumberFilter !== null;

    if (shouldPaginate) {
      const pageSize = limit ?? 100;
      const data = filtered.slice(offset, offset + pageSize);
      const total = filtered.length;

      return NextResponse.json(
        {
          data,
          meta: {
            total,
            offset,
            limit: pageSize,
            hasMore: offset + data.length < total,
          },
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(filtered, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to read huts.json", error);
    return NextResponse.json({ error: "Failed to load huts." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      number?: unknown;
      nextNumber?: unknown;
      name?: unknown;
      type?: unknown;
      status?: unknown;
      capacity?: unknown;
      floor?: unknown;
      zone?: unknown;
    };
    const roomNumber = parsePositiveInteger(body.number);

    if (roomNumber === null) {
      return NextResponse.json({ error: "Invalid room number." }, { status: 400 });
    }

    const huts = [...(await readHuts())];
    const roomIndex = huts.findIndex((room) => room.number === roomNumber);

    if (roomIndex === -1) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const parsedNextNumber =
      body.nextNumber === undefined ? undefined : parsePositiveInteger(body.nextNumber);
    if (body.nextNumber !== undefined && parsedNextNumber === null) {
      return NextResponse.json({ error: "Invalid new room number." }, { status: 400 });
    }

    if (body.type !== undefined && !isRoomType(body.type)) {
      return NextResponse.json({ error: "Invalid room type." }, { status: 400 });
    }

    if (body.status !== undefined && !isRoomStatus(body.status)) {
      return NextResponse.json({ error: "Invalid room status." }, { status: 400 });
    }

    const parsedCapacity =
      body.capacity === undefined ? undefined : parsePositiveInteger(body.capacity);
    if (body.capacity !== undefined && parsedCapacity === null) {
      return NextResponse.json({ error: "Invalid room capacity." }, { status: 400 });
    }

    const parsedFloor =
      body.floor === undefined
        ? undefined
        : body.floor === null
          ? null
          : parsePositiveInteger(body.floor);
    if (body.floor !== undefined && body.floor !== null && parsedFloor === null) {
      return NextResponse.json({ error: "Invalid room floor." }, { status: 400 });
    }

    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length === 0)) {
      return NextResponse.json({ error: "Room name must be a non-empty string." }, { status: 400 });
    }

    if (body.zone !== undefined && body.zone !== null && typeof body.zone !== "string") {
      return NextResponse.json({ error: "Invalid room zone." }, { status: 400 });
    }

    const targetNumber = parsedNextNumber ?? roomNumber;
    if (targetNumber !== roomNumber && huts.some((room) => room.number === targetNumber)) {
      return NextResponse.json({ error: "New room number already exists." }, { status: 409 });
    }

    const currentRoom = huts[roomIndex];
    const trimmedName =
      typeof body.name === "string" ? body.name.trim() : currentRoom.name;
    const trimmedZone =
      typeof body.zone === "string"
        ? body.zone.trim()
        : body.zone === null
          ? ""
          : currentRoom.zone ?? "";

    const updatedRoom: Room = {
      ...currentRoom,
      number: targetNumber,
      ...(trimmedName !== undefined ? { name: trimmedName } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(parsedCapacity !== undefined && parsedCapacity !== null
        ? { capacity: parsedCapacity }
        : {}),
      ...(parsedFloor !== undefined
        ? parsedFloor === null
          ? { floor: undefined }
          : { floor: parsedFloor }
        : {}),
      ...(trimmedZone.length > 0 ? { zone: trimmedZone } : { zone: undefined }),
    };

    huts[roomIndex] = updatedRoom;
    const nextHuts = [...huts].sort((a, b) => a.number - b.number);
    await writeHuts(nextHuts);

    return NextResponse.json(updatedRoom, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to update huts.json", error);
    return NextResponse.json({ error: "Failed to save room update." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      number?: unknown;
      name?: unknown;
      type?: unknown;
      status?: unknown;
      capacity?: unknown;
      floor?: unknown;
      zone?: unknown;
    };

    const parsedNumber = parsePositiveInteger(body.number);
    if (parsedNumber === null) {
      return NextResponse.json({ error: "Invalid room number." }, { status: 400 });
    }

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Room name is required." }, { status: 400 });
    }

    if (!isRoomType(body.type)) {
      return NextResponse.json({ error: "Invalid room type." }, { status: 400 });
    }

    if (!isRoomStatus(body.status)) {
      return NextResponse.json({ error: "Invalid room status." }, { status: 400 });
    }

    const parsedCapacity = parsePositiveInteger(body.capacity);
    if (parsedCapacity === null) {
      return NextResponse.json({ error: "Invalid room capacity." }, { status: 400 });
    }

    const parsedFloor =
      body.floor === undefined
        ? undefined
        : body.floor === null
          ? null
          : parsePositiveInteger(body.floor);
    if (
      body.floor !== undefined &&
      body.floor !== null &&
      parsedFloor === null
    ) {
      return NextResponse.json({ error: "Invalid room floor." }, { status: 400 });
    }

    if (body.zone !== undefined && typeof body.zone !== "string") {
      return NextResponse.json({ error: "Invalid room zone." }, { status: 400 });
    }

    const huts = await readHuts();
    if (huts.some((room) => room.number === parsedNumber)) {
      return NextResponse.json({ error: "Room number already exists." }, { status: 409 });
    }

    const trimmedName = body.name.trim();
    const trimmedZone = typeof body.zone === "string" ? body.zone.trim() : "";

    const newRoom: Room = {
      number: parsedNumber,
      name: trimmedName,
      type: body.type,
      status: body.status,
      capacity: parsedCapacity,
      ...(typeof parsedFloor === "number" ? { floor: parsedFloor } : {}),
      ...(trimmedZone.length > 0 ? { zone: trimmedZone } : {}),
    };

    const nextHuts = [...huts, newRoom].sort((a, b) => a.number - b.number);
    await writeHuts(nextHuts);

    return NextResponse.json(newRoom, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to create room in huts.json", error);
    return NextResponse.json({ error: "Failed to create room." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { number?: unknown };
    const roomNumber = parsePositiveInteger(body.number);

    if (roomNumber === null) {
      return NextResponse.json({ error: "Invalid room number." }, { status: 400 });
    }

    const huts = [...(await readHuts())];
    const roomIndex = huts.findIndex((room) => room.number === roomNumber);

    if (roomIndex === -1) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const [deletedRoom] = huts.splice(roomIndex, 1);
    await writeHuts(huts);

    return NextResponse.json(
      {
        success: true,
        room: deletedRoom,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to delete room from huts.json", error);
    return NextResponse.json({ error: "Failed to delete room." }, { status: 500 });
  }
}
