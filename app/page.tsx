"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "./components/DashboardHeader";
import { FiltersSection } from "./components/FiltersSection";
import { FloorMap } from "./components/FloorMap";
import { RoomModal } from "./components/RoomModal";
import { StatsGrid } from "./components/StatsGrid";
import { Timeline } from "./components/Timeline";
import { Toast } from "./components/Toast";
import {
  buildTimeline,
  diffDays,
  formatDateInput,
  formatDateTime,
  type Room,
  type RoomStatus,
} from "./lib/roomData";
import hutsData from "./lib/huts.json";

interface FiltersState {
  startDate: string;
  endDate: string;
  roomType: string;
  status: string;
}

export default function Home() {
  const initialHuts = useMemo(() => hutsData as Room[], []);
  const [huts, setHuts] = useState<Room[]>(initialHuts);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [dateTime, setDateTime] = useState("");
  const [toast, setToast] = useState<string | null>(null);
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

  const filteredHuts = useMemo(() => {
    let result = huts;

    if (appliedFilters.roomType !== "all") {
      result = result.filter((room) => room.type === appliedFilters.roomType);
    }

    if (appliedFilters.status !== "all") {
      result = result.filter((room) => room.status === appliedFilters.status);
    }

    return result;
  }, [huts, appliedFilters]);

  const timelineRooms = useMemo(() => filteredHuts.slice(0, 10), [filteredHuts]);
  const timeline = useMemo(() => buildTimeline(timelineRooms, 30), [timelineRooms]);

  useEffect(() => {
    const update = () => setDateTime(formatDateTime(new Date()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    setFilters((current) => ({
      ...current,
      startDate: formatDateInput(today),
      endDate: formatDateInput(end),
    }));
    setAppliedFilters((current) => ({
      ...current,
      startDate: formatDateInput(today),
      endDate: formatDateInput(end),
    }));
  }, []);

  const stats = useMemo(() => {
    const available = filteredHuts.filter((room) => room.status === "available").length;
    const occupied = filteredHuts.filter((room) => room.status === "occupied").length;
    const maintenance = filteredHuts.filter((room) => room.status === "maintenance").length;
    const cleaning = filteredHuts.filter((room) => room.status === "cleaning").length;

    return [
      {
        label: "Total Huts",
        value: filteredHuts.length,
        subtitle: `Across ${filteredHuts.length} huts`,
        icon: "BLD",
      },
      {
        label: "Available",
        value: available,
        subtitle: "Ready for guests",
        icon: "OK",
        accentColor: "var(--success)",
      },
      {
        label: "Occupied",
        value: occupied,
        subtitle: "Currently in use",
        icon: "IN",
        accentColor: "var(--danger)",
      },
      {
        label: "Maintenance",
        value: maintenance,
        subtitle: "Under service",
        icon: "SV",
        accentColor: "var(--warning)",
      },
      {
        label: "Cleaning",
        value: cleaning,
        subtitle: "Preparing for guests",
        icon: "CL",
        accentColor: "var(--accent-cyan)",
      },
    ];
  }, [filteredHuts]);

  const handleUpdateStatus = (status: RoomStatus) => {
    if (!selectedRoom) {
      return;
    }

    setHuts((current) =>
      current.map((room) => (room.number === selectedRoom.number ? { ...room, status } : room))
    );
    setSelectedRoom(null);
    setToast(`Hut ${selectedRoom.number} updated to ${status.toUpperCase()}`);
  };

  const handleFilterChange = (field: keyof FiltersState, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handleApplyFilters = () => {
    if (filters.startDate && filters.endDate) {
      const days = diffDays(filters.startDate, filters.endDate);
      setAppliedFilters(filters);

      let nextCount = huts.length;
      if (filters.roomType !== "all" || filters.status !== "all") {
        nextCount = huts.filter((room) => {
          const typeMatch = filters.roomType === "all" || room.type === filters.roomType;
          const statusMatch = filters.status === "all" || room.status === filters.status;
          return typeMatch && statusMatch;
        }).length;
      }

      setToast(
        `Filter applied: ${days} day(s) | Type: ${filters.roomType} | Status: ${filters.status} | ${nextCount} hut(s)`
      );
    }
  };

  const handleResetFilters = () => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 7);
    setFilters({
      startDate: formatDateInput(today),
      endDate: formatDateInput(end),
      roomType: "all",
      status: "all",
    });
    setAppliedFilters({
      startDate: formatDateInput(today),
      endDate: formatDateInput(end),
      roomType: "all",
      status: "all",
    });
    setToast("Filters reset");
  };

  return (
    <div className="relative min-h-screen">
      <div className="bg-pattern" />
      <div className="relative z-10 mx-auto flex max-w-[1920px] flex-col gap-8 px-8 py-7">
        <DashboardHeader
          title="Hut Management System"
          subtitle="Internal Operations Dashboard"
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
        <StatsGrid items={stats} />
        <FloorMap huts={filteredHuts} onRoomClick={setSelectedRoom} />
        <Timeline rooms={timelineRooms} days={30} timeline={timeline} />
      </div>

      <RoomModal
        room={selectedRoom}
        isOpen={Boolean(selectedRoom)}
        onClose={() => setSelectedRoom(null)}
        onUpdateStatus={handleUpdateStatus}
      />
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
