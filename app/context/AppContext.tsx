"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildTimeline,
  formatDateTime,
  type Room,
  type RoomStatus,
  type StatusEntry,
} from "../lib/roomData";
import hutsData from "../lib/huts.json";

type Theme = "light" | "dark";

interface ActivityLogCreatePayload {
  roomNumber: number;
  action: "schedule_added" | "schedule_removed";
  status: RoomStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
}

function buildScheduleLogPayload(
  roomNumber: number,
  previousEntries: StatusEntry[],
  nextEntries: StatusEntry[],
): ActivityLogCreatePayload[] {
  const previousById = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const nextById = new Map(nextEntries.map((entry) => [entry.id, entry]));
  const createdAt = new Date().toISOString();
  const payload: ActivityLogCreatePayload[] = [];

  nextEntries.forEach((entry) => {
    if (!previousById.has(entry.id)) {
      payload.push({
        roomNumber,
        action: "schedule_added",
        status: entry.status,
        startDate: entry.startDate,
        endDate: entry.endDate,
        createdAt,
      });
    }
  });

  previousEntries.forEach((entry) => {
    if (!nextById.has(entry.id)) {
      payload.push({
        roomNumber,
        action: "schedule_removed",
        status: entry.status,
        startDate: entry.startDate,
        endDate: entry.endDate,
        createdAt,
      });
    }
  });

  return payload;
}

function normalizeSchedulesMap(raw: unknown): Record<number, StatusEntry[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const schedules: Record<number, StatusEntry[]> = {};

  for (const [roomKey, entries] of Object.entries(raw as Record<string, unknown>)) {
    const roomNumber = Number(roomKey);
    if (!Number.isInteger(roomNumber) || !Array.isArray(entries)) {
      continue;
    }

    schedules[roomNumber] = entries.filter((entry): entry is StatusEntry => {
      if (!entry || typeof entry !== "object") {
        return false;
      }

      const parsed = entry as Partial<StatusEntry>;
      return (
        typeof parsed.id === "string" &&
        typeof parsed.status === "string" &&
        typeof parsed.startDate === "string" &&
        typeof parsed.endDate === "string" &&
        (parsed.bookedBy === undefined || typeof parsed.bookedBy === "string")
      );
    });
  }

  return schedules;
}

function getTimelineWindow(fromDate: Date): { startDayOffset: number; spanDays: number } {
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const startDayOffset = Math.floor(
    (startOfPreviousMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const spanDays = Math.floor(
    (endOfNextMonth.getTime() - startOfPreviousMonth.getTime()) / (1000 * 60 * 60 * 24),
  ) + 1;

  return { startDayOffset, spanDays };
}

interface AppState {
  huts: Room[];
  schedules: Record<number, StatusEntry[]>;
  timeline: Record<number, RoomStatus[]>;
  timelineStartOffset: number;
  theme: Theme;
  toast: string | null;
  dateTime: string;
  stats: { label: string; value: number; subtitle: string; icon: string; accentColor?: string }[];
  setToast: (msg: string | null) => void;
  handleToggleTheme: () => void;
  refreshHuts: () => Promise<void>;
  handleUpdateSchedule: (roomNumber: number, entries: StatusEntry[]) => void;
}

const AppContext = createContext<AppState | null>(null);

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initialHuts = useMemo(() => hutsData as Room[], []);
  const [huts, setHuts] = useState<Room[]>(initialHuts);
  const [schedules, setSchedules] = useState<Record<number, StatusEntry[]>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [hasHydratedTheme, setHasHydratedTheme] = useState(false);
  const [dateTime, setDateTime] = useState("");

  const { startDayOffset: timelineStartOffset, spanDays: timelineSpanDays } = getTimelineWindow(
    new Date(),
  );
  const timeline = useMemo(
    () => buildTimeline(huts, timelineSpanDays, schedules, timelineStartOffset),
    [huts, schedules, timelineSpanDays, timelineStartOffset],
  );

  const refreshHuts = useCallback(async () => {
    try {
      const response = await fetch("/api/huts", { cache: "no-store" });
      if (!response.ok) throw new Error(`Load failed with status ${response.status}`);
      const data = (await response.json()) as Room[];
      setHuts(data);
    } catch (error) {
      console.error("Failed to load huts from API", error);
      setToast("Could not load saved room data. Using local fallback.");
    }
  }, []);

  // Load huts from API
  useEffect(() => {
    void refreshHuts();
  }, [refreshHuts]);

  // Load persisted schedules from API
  useEffect(() => {
    let isMounted = true;

    const loadSchedules = async () => {
      try {
        const response = await fetch("/api/schedules", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Load failed with status ${response.status}`);
        }

        const data = (await response.json()) as unknown;
        if (isMounted) {
          setSchedules(normalizeSchedulesMap(data));
        }
      } catch (error) {
        console.error("Failed to load schedules from API", error);
        if (isMounted) {
          setToast("Could not load saved availability schedules.");
        }
      }
    };

    void loadSchedules();

    return () => {
      isMounted = false;
    };
  }, []);

  // Clock
  useEffect(() => {
    const update = () => setDateTime(formatDateTime(new Date()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Theme hydration
  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    } else {
      const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      setTheme(preferredTheme);
    }
    setHasHydratedTheme(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedTheme) return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme, hasHydratedTheme]);

  const stats = useMemo(() => {
    const available = huts.filter((r) => r.status === "available").length;
    const occupied = huts.filter((r) => r.status === "occupied").length;
    const maintenance = huts.filter((r) => r.status === "maintenance").length;
    const cleaning = huts.filter((r) => r.status === "cleaning").length;
    return [
      { label: "Total Rooms", value: huts.length, subtitle: `${huts.length} rooms managed`, icon: "BLD" },
      { label: "Available", value: available, subtitle: "Ready for guests", icon: "OK", accentColor: "var(--success)" },
      { label: "Occupied", value: occupied, subtitle: "Currently in use", icon: "IN", accentColor: "var(--danger)" },
      { label: "Maintenance", value: maintenance, subtitle: "Under service", icon: "SV", accentColor: "var(--warning)" },
      { label: "Cleaning", value: cleaning, subtitle: "Being prepared", icon: "CL", accentColor: "var(--accent-cyan)" },
    ];
  }, [huts]);

  const handleToggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const handleUpdateSchedule = useCallback((roomNumber: number, entries: StatusEntry[]) => {
    const previousEntries = schedules[roomNumber] ?? [];
    const logPayload = buildScheduleLogPayload(roomNumber, previousEntries, entries);

    setSchedules((prev) => {
      const next = { ...prev };
      if (entries.length === 0) {
        delete next[roomNumber];
      } else {
        next[roomNumber] = entries;
      }
      return next;
    });

    void (async () => {
      try {
        const scheduleResponse = await fetch("/api/schedules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomNumber, entries }),
        });

        if (!scheduleResponse.ok) {
          throw new Error(`Schedule write failed with status ${scheduleResponse.status}`);
        }

        setToast(`Availability saved for Room ${roomNumber}`);

        if (logPayload.length === 0) {
          return;
        }

        const logResponse = await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: logPayload }),
        });

        if (!logResponse.ok) {
          throw new Error(`Log write failed with status ${logResponse.status}`);
        }
      } catch (error) {
        console.error("Failed to save schedules/logs", error);

        setSchedules((prev) => {
          const next = { ...prev };
          if (previousEntries.length === 0) {
            delete next[roomNumber];
          } else {
            next[roomNumber] = previousEntries;
          }
          return next;
        });

        setToast(`Failed to save availability for Room ${roomNumber}`);
      }
    })();
  }, [schedules]);

  const value = useMemo<AppState>(
    () => ({
      huts,
      schedules,
      timeline,
      timelineStartOffset,
      theme,
      toast,
      dateTime,
      stats,
      setToast,
      handleToggleTheme,
      refreshHuts,
      handleUpdateSchedule,
    }),
    [
      huts,
      schedules,
      timeline,
      timelineStartOffset,
      theme,
      toast,
      dateTime,
      stats,
      handleToggleTheme,
      refreshHuts,
      handleUpdateSchedule,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
