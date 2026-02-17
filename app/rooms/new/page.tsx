"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { DashboardHeader } from "../../components/DashboardHeader";
import { useAppState } from "../../context/AppContext";
import type { RoomStatus, RoomType } from "../../lib/roomData";

const roomTypes: RoomType[] = ["single", "double", "suite", "deluxe"];
const roomStatuses: RoomStatus[] = ["available", "occupied", "maintenance", "cleaning"];
const statusTone: Record<RoomStatus, string> = {
  available: "var(--success)",
  occupied: "var(--danger)",
  maintenance: "var(--warning)",
  cleaning: "var(--accent-cyan)",
};

interface RoomFormState {
  number: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  capacity: string;
  floor: string;
  zone: string;
}

export default function NewRoomPage() {
  const { dateTime } = useAppState();
  const [form, setForm] = useState<RoomFormState>({
    number: "",
    name: "",
    type: "single",
    status: "available",
    capacity: "1",
    floor: "",
    zone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSuggestedNumber = async () => {
      try {
        const response = await fetch("/api/huts?summary=1", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { maxNumber?: unknown };
        const maxNumber = typeof payload.maxNumber === "number" && Number.isInteger(payload.maxNumber)
          ? payload.maxNumber
          : 0;
        const nextNumber = maxNumber + 1;

        if (mounted) {
          setForm((current) => (current.number ? current : { ...current, number: String(nextNumber) }));
        }
      } catch {
        // Use manual entry if suggestion fails.
      }
    };

    void loadSuggestedNumber();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (field: keyof RoomFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const number = Number(form.number);
    const capacity = Number(form.capacity);
    const floor = form.floor.trim().length > 0 ? Number(form.floor) : undefined;

    if (!Number.isInteger(number) || number <= 0) {
      setError("Room number must be a positive whole number.");
      return;
    }

    if (form.name.trim().length === 0) {
      setError("Room name is required.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      setError("Capacity must be a positive whole number.");
      return;
    }

    if (floor !== undefined && (!Number.isInteger(floor) || floor <= 0)) {
      setError("Floor must be a positive whole number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/huts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number,
          name: form.name.trim(),
          type: form.type,
          status: form.status,
          capacity,
          floor,
          zone: form.zone.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save room.");
      }

      setSuccess("Room created and saved to JSON.");
      window.setTimeout(() => {
        window.location.assign("/");
      }, 700);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save room.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewName = form.name.trim() || "Untitled Room";
  const previewType = form.type.charAt(0).toUpperCase() + form.type.slice(1);
  const previewStatus = form.status.charAt(0).toUpperCase() + form.status.slice(1);
  const previewZone = form.zone.trim() || "Unassigned Zone";
  const previewCapacity =
    Number.isInteger(Number(form.capacity)) && Number(form.capacity) > 0
      ? `${form.capacity} guest${Number(form.capacity) > 1 ? "s" : ""}`
      : "Capacity pending";
  const previewFloor =
    Number.isInteger(Number(form.floor)) && Number(form.floor) > 0 ? `Floor ${form.floor}` : "Floor not set";

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-4 pt-14 sm:p-6 md:pt-6">
      <DashboardHeader
        title="Add Room"
        subtitle="Create and register a room in the same live system data."
        statusLabel="LIVE"
        dateTime={dateTime}
      />

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 sm:p-6">
          <form className="grid grid-cols-1 gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="md:col-span-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Room Details</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Fill in operational data used by the dashboard and timeline.
                </p>
              </div>
              <Link
                href="/"
                className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)]"
              >
                Back
              </Link>
            </div>

            <div className="md:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              New rooms are saved directly to `huts.json` via the backend API.
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Room Number
              </span>
              <input
                type="number"
                min={1}
                value={form.number}
                onChange={(event) => handleChange("number", event.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Room Name
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Example: Sunset Suite"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Room Type
              </span>
              <select
                value={form.type}
                onChange={(event) => handleChange("type", event.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
              >
                {roomTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) => handleChange("status", event.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
              >
                {roomStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Capacity
              </span>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(event) => handleChange("capacity", event.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Floor
              </span>
              <input
                type="number"
                min={1}
                value={form.floor}
                onChange={(event) => handleChange("floor", event.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
                placeholder="Optional"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Zone
              </span>
              <input
                type="text"
                value={form.zone}
                onChange={(event) => handleChange("zone", event.target.value)}
                placeholder="Example: North Wing"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
              />
            </label>

            {error ? (
              <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)] md:col-span-2">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success)] md:col-span-2">
                {success}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save Room"}
              </button>
            </div>
          </form>
        </div>

        <aside className="grid gap-4 xl:sticky xl:top-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <h3 className="text-base font-semibold">Live Preview</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              This is how the room record will appear after save.
            </p>

            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    Room {form.number || "--"}
                  </p>
                  <h4 className="mt-1 text-lg font-semibold">{previewName}</h4>
                </div>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    color: statusTone[form.status],
                    backgroundColor: `color-mix(in srgb, ${statusTone[form.status]} 18%, transparent)`,
                  }}
                >
                  {previewStatus}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-2">
                  Type: <span className="font-medium text-[var(--text-primary)]">{previewType}</span>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-2">
                  {previewFloor}
                </div>
                <div className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-2">
                  {previewZone}
                </div>
                <div className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-2">
                  {previewCapacity}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Notes
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li>Use a unique room number.</li>
                <li>Zone helps grouping in operations view.</li>
                <li>Default status applies until schedules override it.</li>
              </ul>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
