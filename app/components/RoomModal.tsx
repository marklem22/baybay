"use client";

import { useEffect, useState } from "react";
import type { Room, RoomStatus } from "../lib/roomData";

interface RoomModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (status: RoomStatus) => void;
}

export function RoomModal({ room, isOpen, onClose, onUpdateStatus }: RoomModalProps) {
  const [nextStatus, setNextStatus] = useState<RoomStatus>(room?.status ?? "available");

  useEffect(() => {
    if (room) {
      setNextStatus(room.status);
    }
  }, [room]);

  if (!isOpen || !room) {
    return null;
  }

  const capacityLabel = `${room.capacity} Guest${room.capacity > 1 ? "s" : ""}`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.85)] backdrop-blur animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-[90%] max-w-[600px] rounded-[20px] border border-[var(--border)] bg-[var(--bg-secondary)] p-10 shadow-[0_25px_60px_rgba(0,0,0,0.5)] animate-slide-up"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-8 flex items-center justify-between border-b border-[var(--border)] pb-5">
          <h2 className="bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text font-mono text-[2em] font-extrabold text-transparent">
            HUT {room.number}
          </h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] text-[1.5em] text-[var(--text-secondary)] transition hover:rotate-90 hover:border-[var(--danger)] hover:text-[var(--danger)]"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="grid gap-5">
          <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <span className="text-[0.9em] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
              Hut Type
            </span>
            <span className="font-mono text-[1.1em] font-bold">{room.type.toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <span className="text-[0.9em] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
              Hut Zone
            </span>
            <span className="font-mono text-[1.1em] font-bold">{room.zone ?? "Main"}</span>
          </div>
          <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <span className="text-[0.9em] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
              Capacity
            </span>
            <span className="font-mono text-[1.1em] font-bold">{capacityLabel}</span>
          </div>
          <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <span className="text-[0.9em] font-semibold uppercase tracking-[0.5px] text-[var(--text-secondary)]">
              Current Status
            </span>
            <span className="font-mono text-[1.1em] font-bold">{room.status.toUpperCase()}</span>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--border)] pt-8">
          <label className="mb-3 block font-bold text-[var(--text-primary)]">Update Hut Status</label>
          <select
            className="mb-5 w-full cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 font-mono text-[0.95em] text-[var(--text-primary)]"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as RoomStatus)}
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
          </select>
          <button
            type="button"
            className="w-full rounded-[12px] bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] px-6 py-3 text-[0.95em] font-bold uppercase tracking-[0.5px] text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(59,130,246,0.4)]"
            onClick={() => onUpdateStatus(nextStatus)}
          >
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
}
