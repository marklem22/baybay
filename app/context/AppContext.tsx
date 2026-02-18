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

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  accentBlue: string;
  accentPurple: string;
  accentCyan: string;
  success: string;
  warning: string;
  danger: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  isBuiltIn: boolean;
  colors: ThemeColors;
  font: string;
}

export interface ThemeSettings {
  activePreset: string;
  presets: ThemePreset[];
}

/** Apply a preset's CSS variables and keep a fixed app font. */
function applyPresetToDOM(preset: ThemePreset) {
  const root = document.documentElement;
  const c = preset.colors;

  root.style.setProperty("--bg-primary", c.bgPrimary);
  root.style.setProperty("--bg-secondary", c.bgSecondary);
  root.style.setProperty("--bg-card", c.bgCard);
  root.style.setProperty("--accent-blue", c.accentBlue);
  root.style.setProperty("--accent-purple", c.accentPurple);
  root.style.setProperty("--accent-cyan", c.accentCyan);
  root.style.setProperty("--success", c.success);
  root.style.setProperty("--warning", c.warning);
  root.style.setProperty("--danger", c.danger);
  root.style.setProperty("--text-primary", c.textPrimary);
  root.style.setProperty("--text-secondary", c.textSecondary);
  root.style.setProperty("--text-muted", c.textMuted);

  // Derived soft colours
  const hexToRgb = (hex: string) => {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };
  root.style.setProperty("--success-soft", `rgba(${hexToRgb(c.success)}, 0.1)`);
  root.style.setProperty("--danger-soft", `rgba(${hexToRgb(c.danger)}, 0.1)`);
  root.style.setProperty("--warning-soft", `rgba(${hexToRgb(c.warning)}, 0.1)`);
  root.style.setProperty("--accent-cyan-soft", `rgba(${hexToRgb(c.accentCyan)}, 0.1)`);
  root.style.setProperty("--hover", `rgba(${hexToRgb(c.accentBlue)}, 0.08)`);
  root.style.setProperty("--border", `rgba(${hexToRgb(c.textSecondary)}, 0.08)`);

  // Keep app font fixed to default.
  root.style.setProperty("--font-sans", '"Inter", system-ui, -apple-system, sans-serif');
}

/** Determine if hex color is perceived as "light" using luminance */
function isLightColor(hex: string): boolean {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

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
  themeSettings: ThemeSettings | null;
  setToast: (msg: string | null) => void;
  refreshHuts: () => Promise<void>;
  handleUpdateSchedule: (roomNumber: number, entries: StatusEntry[]) => void;
  handleUpdateSettings: (settings: ThemeSettings) => Promise<void>;
  handleApplyPreset: (presetId: string) => void;
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
  const [theme, setTheme] = useState<Theme>("light");
  const [dateTime, setDateTime] = useState("");
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);

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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  // Load theme settings from API
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load settings");
        const data = (await response.json()) as ThemeSettings;
        if (isMounted) {
          setThemeSettings(data);
          const active = data.presets.find((p) => p.id === data.activePreset);
          if (active) {
            applyPresetToDOM(active);
            // Determine if this preset is a "light" or "dark" one
            const isLight = isLightColor(active.colors.bgPrimary);
            setTheme(isLight ? "light" : "dark");
          }
        }
      } catch (error) {
        console.error("Failed to load theme settings", error);
      }
    };
    void loadSettings();
    return () => { isMounted = false; };
  }, []);

  const handleApplyPreset = useCallback((presetId: string) => {
    if (!themeSettings) return;
    const preset = themeSettings.presets.find((p) => p.id === presetId);
    if (!preset) return;
    applyPresetToDOM(preset);
    const isLight = isLightColor(preset.colors.bgPrimary);
    setTheme(isLight ? "light" : "dark");
    setThemeSettings((prev) => prev ? { ...prev, activePreset: presetId } : prev);
  }, [themeSettings]);

  const handleUpdateSettings = useCallback(async (settings: ThemeSettings) => {
    setThemeSettings(settings);
    const active = settings.presets.find((p) => p.id === settings.activePreset);
    if (active) {
      applyPresetToDOM(active);
      const isLight = isLightColor(active.colors.bgPrimary);
      setTheme(isLight ? "light" : "dark");
    }
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Save failed");
      setToast("Theme settings saved");
    } catch (error) {
      console.error("Failed to save theme settings", error);
      setToast("Failed to save theme settings");
    }
  }, []);

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
      themeSettings,
      setToast,
      refreshHuts,
      handleUpdateSchedule,
      handleUpdateSettings,
      handleApplyPreset,
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
      themeSettings,
      refreshHuts,
      handleUpdateSchedule,
      handleUpdateSettings,
      handleApplyPreset,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
