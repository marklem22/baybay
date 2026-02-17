export type RoomStatus = "available" | "occupied" | "maintenance" | "cleaning";
export type RoomType = "single" | "double" | "suite" | "deluxe";

export interface Room {
  number: number;
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

export function buildTimeline(rooms: Room[], days: number): Record<number, RoomStatus[]> {
  const timeline: Record<number, RoomStatus[]> = {};
  const choices: RoomStatus[] = ["available", "occupied", "available"];

  rooms.forEach((room) => {
    timeline[room.number] = Array.from({ length: days }, () => {
      return choices[Math.floor(Math.random() * choices.length)];
    });
  });

  return timeline;
}
