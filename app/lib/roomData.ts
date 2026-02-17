export type RoomStatus = "available" | "occupied" | "maintenance" | "cleaning";
export type RoomType = "single" | "double" | "suite" | "deluxe";

export interface Room {
  number: number;
  name?: string;
  type: RoomType;
  status: RoomStatus;
  floor?: number;
  capacity: number;
  zone?: string;
}

export interface Floor {
  number: number;
  rooms: Room[];
}

/** A date-range-based status entry for scheduling room availability */
export interface StatusEntry {
  id: string;
  status: RoomStatus;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  bookedBy?: string;
}

export type ActivityLogAction = "schedule_added" | "schedule_removed";

export interface ActivityLog {
  id: string;
  roomNumber: number;
  action: ActivityLogAction;
  status: RoomStatus;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdAt: string; // ISO string
}

const ROOM_TYPES: RoomType[] = ["single", "double", "suite", "deluxe"];
const ROOM_STATUSES: RoomStatus[] = [
  "available",
  "available",
  "available",
  "occupied",
  "maintenance",
  "cleaning",
];

export function buildRandomFloors(floorCount: number, roomsPerFloor: number): Floor[] {
  const floors: Floor[] = [];

  for (let floor = 1; floor <= floorCount; floor += 1) {
    const rooms: Room[] = [];

    for (let room = 1; room <= roomsPerFloor; room += 1) {
      rooms.push({
        number: floor * 100 + room,
        type: ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)],
        status: ROOM_STATUSES[Math.floor(Math.random() * ROOM_STATUSES.length)],
        floor,
        capacity: Math.floor(Math.random() * 3) + 1,
      });
    }

    floors.push({ number: floor, rooms });
  }

  return floors;
}

export function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(value: Date): string {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function diffDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Generate a unique ID for schedule entries */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Resolve the status for a specific date given a list of schedule entries.
 * Later entries take priority. Falls back to defaultStatus.
 */
export function getStatusForDate(
  schedule: StatusEntry[],
  date: Date,
  defaultStatus: RoomStatus,
): RoomStatus {
  const dateStr = formatDateInput(date);
  for (let i = schedule.length - 1; i >= 0; i--) {
    const entry = schedule[i];
    if (dateStr >= entry.startDate && dateStr <= entry.endDate) {
      return entry.status;
    }
  }
  return defaultStatus;
}

/**
 * Resolve the most recent schedule entry for a specific date.
 * Later entries take priority. Returns null when no entry matches.
 */
export function getScheduleEntryForDate(
  schedule: StatusEntry[],
  date: Date,
): StatusEntry | null {
  const dateStr = formatDateInput(date);
  for (let i = schedule.length - 1; i >= 0; i--) {
    const entry = schedule[i];
    if (dateStr >= entry.startDate && dateStr <= entry.endDate) {
      return entry;
    }
  }
  return null;
}

/**
 * Build a timeline array for each room.
 * Uses schedule entries when provided; otherwise falls back to room.status for every day.
 */
export function buildTimeline(
  rooms: Room[],
  days: number,
  schedules?: Record<number, StatusEntry[]>,
  startDayOffset = 0,
): Record<number, RoomStatus[]> {
  const timeline: Record<number, RoomStatus[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  rooms.forEach((room) => {
    const roomSchedule = schedules?.[room.number] ?? [];
    timeline[room.number] = Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + startDayOffset + i);
      return getStatusForDate(roomSchedule, date, room.status);
    });
  });

  return timeline;
}
