import path from "node:path";
import { NextResponse } from "next/server";
import type { Room } from "../../../lib/roomData";
import { readJsonFile, writeJsonFile } from "../../../lib/server/jsonFileStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hutsFilePath = path.join(process.cwd(), "app", "lib", "huts.json");
const archivedHutsFilePath = path.join(process.cwd(), "app", "lib", "archivedHuts.json");

interface ArchivedRoom {
  room: Room;
  archivedAt: string;
}

async function readHuts(): Promise<Room[]> {
  const parsed = await readJsonFile<unknown>(hutsFilePath);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as Room[];
}

async function writeHuts(huts: Room[]): Promise<void> {
  await writeJsonFile(hutsFilePath, huts);
}

async function readArchive(): Promise<ArchivedRoom[]> {
  const parsed = await readJsonFile<unknown>(archivedHutsFilePath);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed as ArchivedRoom[];
}

async function writeArchive(archive: ArchivedRoom[]): Promise<void> {
  await writeJsonFile(archivedHutsFilePath, archive);
}

/** GET – list all archived rooms */
export async function GET() {
  try {
    const archive = await readArchive();
    return NextResponse.json(
      { data: archive, total: archive.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to read archived rooms", error);
    return NextResponse.json({ error: "Failed to load archived rooms." }, { status: 500 });
  }
}

/** POST – restore archived rooms back to active */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: unknown;
      numbers?: unknown;
    };
    const mode = body.mode;

    if (mode !== "all" && mode !== "selected") {
      return NextResponse.json({ error: "Invalid restore mode." }, { status: 400 });
    }

    const archive = await readArchive();
    const huts = await readHuts();

    if (mode === "all") {
      const restoredCount = archive.length;
      if (restoredCount > 0) {
        const restoredRooms = archive.map((entry) => entry.room);
        await writeHuts([...restoredRooms, ...huts]);
        await writeArchive([]);
      }
      return NextResponse.json(
        { success: true, restoredCount },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // mode === "selected"
    const numbers = body.numbers;
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "A non-empty numbers array is required." }, { status: 400 });
    }

    const numberSet = new Set(
      numbers
        .filter((n): n is number => typeof n === "number" && Number.isInteger(n))
    );

    const toRestore = archive.filter((entry) => numberSet.has(entry.room.number));
    const remainingArchive = archive.filter((entry) => !numberSet.has(entry.room.number));
    const restoredCount = toRestore.length;

    if (restoredCount === 0) {
      return NextResponse.json({ error: "No matching archived rooms found." }, { status: 404 });
    }

    const restoredRooms = toRestore.map((entry) => entry.room);
    await writeHuts([...restoredRooms, ...huts]);
    await writeArchive(remainingArchive);

    return NextResponse.json(
      { success: true, restoredCount },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to restore archived rooms", error);
    return NextResponse.json({ error: "Failed to restore rooms." }, { status: 500 });
  }
}

/** DELETE – permanently delete archived rooms */
export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: unknown;
      numbers?: unknown;
    };
    const mode = body.mode;

    if (mode !== "all" && mode !== "selected") {
      return NextResponse.json({ error: "Invalid delete mode." }, { status: 400 });
    }

    const archive = await readArchive();

    if (mode === "all") {
      const deletedCount = archive.length;
      await writeArchive([]);
      return NextResponse.json(
        { success: true, deletedCount },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const numbers = body.numbers;
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "A non-empty numbers array is required." }, { status: 400 });
    }

    const numberSet = new Set(
      numbers
        .filter((n): n is number => typeof n === "number" && Number.isInteger(n))
    );

    const remaining = archive.filter((entry) => !numberSet.has(entry.room.number));
    const deletedCount = archive.length - remaining.length;

    if (deletedCount === 0) {
      return NextResponse.json({ error: "No matching archived rooms found." }, { status: 404 });
    }

    await writeArchive(remaining);

    return NextResponse.json(
      { success: true, deletedCount },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to delete archived rooms", error);
    return NextResponse.json({ error: "Failed to delete archived rooms." }, { status: 500 });
  }
}
