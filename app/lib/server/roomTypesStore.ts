import path from "node:path";
import type { RoomTypeRecord } from "../roomData";
import { readJsonFile, writeJsonFile } from "./jsonFileStore";

const roomTypesFilePath = path.join(process.cwd(), "app", "lib", "roomTypes.json");
const roomTypeKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeRoomTypeLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

function normalizeRoomTypeDescription(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAmenities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    unique.add(trimmed);
  }

  return Array.from(unique);
}

function normalizeDefaultCapacity(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 1;
}

export function normalizeRoomTypeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isValidRoomTypeKey(value: unknown): value is string {
  return typeof value === "string" && roomTypeKeyPattern.test(value);
}

function normalizeRoomTypeEntry(value: unknown): RoomTypeRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Partial<RoomTypeRecord>;
  const label = normalizeRoomTypeLabel(source.label);
  if (!label) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const normalizedKey = typeof source.key === "string" ? normalizeRoomTypeKey(source.key) : "";

  if (!isValidRoomTypeKey(normalizedKey)) {
    return null;
  }

  return {
    key: normalizedKey,
    label,
    description: normalizeRoomTypeDescription(source.description),
    defaultCapacity: normalizeDefaultCapacity(source.defaultCapacity),
    amenities: normalizeAmenities(source.amenities),
    isActive: source.isActive !== false,
    createdAt: isIsoDate(source.createdAt) ? source.createdAt : nowIso,
    updatedAt: isIsoDate(source.updatedAt) ? source.updatedAt : nowIso,
  };
}

function dedupeByKey(entries: RoomTypeRecord[]): RoomTypeRecord[] {
  const seen = new Set<string>();
  const deduped: RoomTypeRecord[] = [];

  for (const entry of entries) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    deduped.push(entry);
  }

  return deduped;
}

function sortRoomTypes(entries: RoomTypeRecord[]): RoomTypeRecord[] {
  return [...entries].sort((a, b) => a.label.localeCompare(b.label));
}

export async function readRoomTypes(): Promise<RoomTypeRecord[]> {
  const parsed = await readJsonFile<unknown>(roomTypesFilePath);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid roomTypes.json format.");
  }

  const normalized = parsed
    .map((entry) => normalizeRoomTypeEntry(entry))
    .filter((entry): entry is RoomTypeRecord => Boolean(entry));

  return sortRoomTypes(dedupeByKey(normalized));
}

export async function writeRoomTypes(roomTypes: RoomTypeRecord[]): Promise<void> {
  await writeJsonFile(roomTypesFilePath, sortRoomTypes(roomTypes));
}
