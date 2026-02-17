"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "./components/DashboardHeader";
import { FiltersSection } from "./components/FiltersSection";
import { FloorMap } from "./components/FloorMap";
import { RoomModal } from "./components/RoomModal";
import { StatsGrid } from "./components/StatsGrid";
import { Timeline } from "./components/Timeline";
import { useAppState } from "./context/AppContext";
import { formatDateInput, getStatusForDate, type Room, type RoomStatus } from "./lib/roomData";

interface FiltersState {
  startDate: string;
  endDate: string;
  roomType: string;
  status: string;
}

function normalizeDateRange(startDate: string, endDate: string): { start: Date; end: Date } | null {
  const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  const end = endDate ? new Date(`${endDate}T00:00:00`) : new Date(start);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start > end) {
    return null;
  }

  return { start, end };
}

export default function RoomsPage() {
  const { huts, schedules, timeline, timelineStartOffset, dateTime, handleUpdateSchedule, refreshHuts, setToast } = useAppState();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedDateRaw, setSelectedDateRaw] = useState<string | undefined>(undefined);
  const [selectedDayStatus, setSelectedDayStatus] = useState<RoomStatus | undefined>(undefined);
  const [filters, setFilters] = useState<FiltersState>({
    startDate: "",
    endDate: "",
    roomType: "all",
    status: "all",
  });
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>({
    startDate: "",
    endDate: "",
    roomType: "all",
    status: "all",
  });

  useEffect(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 7);

    const defaultFilters: FiltersState = {
      startDate: formatDateInput(today),
      endDate: formatDateInput(end),
      roomType: "all",
      status: "all",
    };

    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, []);

  const filteredRooms = useMemo(() => {
    return huts.filter((room) => {
      if (appliedFilters.roomType !== "all" && room.type !== appliedFilters.roomType) {
        return false;
      }

      const roomSchedule = schedules[room.number] ?? [];
      const range = normalizeDateRange(appliedFilters.startDate, appliedFilters.endDate);
      if (!range) {
        return false;
      }

      const statusByDay: RoomStatus[] = [];
      const cursor = new Date(range.start);
      while (cursor <= range.end) {
        const statusForDay = getStatusForDate(roomSchedule, cursor, room.status);
        statusByDay.push(statusForDay);
        cursor.setDate(cursor.getDate() + 1);
      }

      if (appliedFilters.status === "all" || appliedFilters.status === "available") {
        return statusByDay.every((status) => status === "available");
      }

      return statusByDay.some((status) => status === appliedFilters.status);
    });
  }, [huts, schedules, appliedFilters]);

  const filteredStats = useMemo(() => {
    const referenceDate = appliedFilters.startDate
      ? new Date(`${appliedFilters.startDate}T00:00:00`)
      : new Date();
    referenceDate.setHours(0, 0, 0, 0);

    const counts: Record<RoomStatus, number> = {
      available: 0,
      occupied: 0,
      maintenance: 0,
      cleaning: 0,
    };

    filteredRooms.forEach((room) => {
      const roomSchedule = schedules[room.number] ?? [];
      const statusForReferenceDate = getStatusForDate(roomSchedule, referenceDate, room.status);
      counts[statusForReferenceDate] += 1;
    });

    return [
      {
        label: "Total Rooms",
        value: filteredRooms.length,
        subtitle: `${filteredRooms.length} rooms shown`,
        icon: "BLD",
      },
      {
        label: "Available",
        value: counts.available,
        subtitle: "Ready for guests",
        icon: "OK",
        accentColor: "var(--success)",
      },
      {
        label: "Occupied",
        value: counts.occupied,
        subtitle: "Currently in use",
        icon: "IN",
        accentColor: "var(--danger)",
      },
      {
        label: "Maintenance",
        value: counts.maintenance,
        subtitle: "Under service",
        icon: "SV",
        accentColor: "var(--warning)",
      },
      {
        label: "Cleaning",
        value: counts.cleaning,
        subtitle: "Being prepared",
        icon: "CL",
        accentColor: "var(--accent-cyan)",
      },
    ];
  }, [filteredRooms, schedules, appliedFilters.startDate]);

  const handleFilterChange = (
    field: "startDate" | "endDate" | "roomType" | "status",
    value: string,
  ) => {
    setFilters((current) => {
      const next = { ...current, [field]: value };
      setAppliedFilters(next);
      return next;
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setToast(`Filters applied. Showing ${filteredRooms.length} room(s).`);
  };

  const handleResetFilters = () => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 7);

    const resetFilters: FiltersState = {
      startDate: formatDateInput(today),
      endDate: formatDateInput(end),
      roomType: "all",
      status: "all",
    };

    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    void refreshHuts();
    setToast("Filters reset and room data refreshed.");
  };

  const handleFloorMapRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setSelectedDate(undefined);
    setSelectedDateRaw(undefined);
    setSelectedDayStatus(undefined);
  };

  const handleTimelineRoomClick = (room: Room, dayIndex: number, status: RoomStatus) => {
    const date = new Date();
    date.setDate(date.getDate() + dayIndex);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    setSelectedDateRaw(`${year}-${month}-${day}`);
    setSelectedRoom(room);
    setSelectedDate(dateStr);
    setSelectedDayStatus(status);
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-4 pt-14 sm:p-6 md:pt-6">
      <DashboardHeader
        title="Room Management"
        subtitle="Manage and monitor your rooms"
        statusLabel="LIVE"
        dateTime={dateTime}
      />

      <FiltersSection
        startDate={filters.startDate}
        endDate={filters.endDate}
        roomType={filters.roomType}
        status={filters.status}
        onChange={handleFilterChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      <StatsGrid items={filteredStats} />

      <FloorMap huts={filteredRooms} onRoomClick={handleFloorMapRoomClick} />

      <Timeline
        rooms={filteredRooms}
        timeline={timeline}
        schedules={schedules}
        timelineStartOffset={timelineStartOffset}
        onRoomClick={handleTimelineRoomClick}
      />

      <RoomModal
        room={selectedRoom}
        isOpen={Boolean(selectedRoom)}
        onClose={() => {
          setSelectedRoom(null);
          setSelectedDate(undefined);
          setSelectedDateRaw(undefined);
          setSelectedDayStatus(undefined);
        }}
        selectedDate={selectedDate}
        selectedDateRaw={selectedDateRaw}
        selectedDayStatus={selectedDayStatus}
        schedule={selectedRoom ? schedules[selectedRoom.number] ?? [] : []}
        onUpdateSchedule={handleUpdateSchedule}
      />
    </div>
  );
}
