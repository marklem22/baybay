"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ConfirmationModal } from "../../../components/ConfirmationModal";
import { DashboardHeader } from "../../../components/DashboardHeader";
import { useAppState } from "../../../context/AppContext";
import type { Room, RoomStatus, RoomTypeRecord } from "../../../lib/roomData";

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
  type: string;
  status: RoomStatus;
  capacity: string;
  floor: string;
  zone: string;
}

function toFormState(room: Room): RoomFormState {
  return {
    number: String(room.number),
    name: room.name ?? "",
    type: room.type,
    status: room.status,
    capacity: String(room.capacity),
    floor: typeof room.floor === "number" ? String(room.floor) : "",
    zone: room.zone ?? "",
  };
}

export default function EditRoomPage() {
  const router = useRouter();
  const { dateTime } = useAppState();
  const params = useParams<{ number: string }>();
  const roomNumberParam = params?.number;
  const roomNumber = Number(roomNumberParam);
  const [initialRoomNumber, setInitialRoomNumber] = useState<number | null>(null);
  const [form, setForm] = useState<RoomFormState>({
    number: "",
    name: "",
    type: "",
    status: "available",
    capacity: "1",
    floor: "",
    zone: "",
  });
  const [roomTypes, setRoomTypes] = useState<RoomTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(roomNumber) || roomNumber <= 0) {
      setError("Invalid room number in URL.");
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const loadRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/huts?number=${roomNumber}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Load failed with status ${response.status}`);
        }

        const payload = (await response.json()) as
          | Room[]
          | { data?: Room[]; meta?: unknown };

        const rooms = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.data)
            ? payload.data
            : [];

        if (rooms.length === 0) {
          throw new Error(`Room ${roomNumber} was not found.`);
        }

        const room = rooms[0];

        if (mounted) {
          setInitialRoomNumber(room.number);
          setForm(toFormState(room));
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load room details.";
        if (mounted) {
          setError(message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRoom();

    return () => {
      mounted = false;
    };
  }, [roomNumber]);

  useEffect(() => {
    let mounted = true;

    const loadRoomTypes = async () => {
      try {
        const response = await fetch("/api/room-types?usage=0", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Load failed with status ${response.status}`);
        }

        const payload = (await response.json()) as RoomTypeRecord[];
        if (!mounted || !Array.isArray(payload)) return;
        setRoomTypes(payload);

        setForm((current) => {
          const hasCurrent = payload.some((entry) => entry.key === current.type);
          if (hasCurrent || current.type.length > 0) {
            return current;
          }
          return { ...current, type: payload[0]?.key ?? "" };
        });
      } catch (loadError) {
        console.error("Failed to load room types", loadError);
      }
    };

    void loadRoomTypes();
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

    if (initialRoomNumber === null) {
      setError("Room details are not loaded yet.");
      return;
    }

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

    if (form.type.trim().length === 0) {
      setError("Select a room type first.");
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: initialRoomNumber,
          nextNumber: number,
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
        throw new Error(payload?.error ?? "Failed to update room.");
      }

      const updated = (await response.json()) as Room;
      setInitialRoomNumber(updated.number);
      setForm(toFormState(updated));
      setSuccess(`Room ${updated.number} updated.`);
      window.setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to update room.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveRoom = async () => {
    if (initialRoomNumber === null) {
      setError("Room details are not loaded yet.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsArchiving(true);

    try {
      const response = await fetch("/api/huts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: initialRoomNumber }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to archive room.");
      }

      const payload = (await response.json()) as { room?: Room };
      const archivedRoomNumber = payload.room?.number ?? initialRoomNumber;

      setSuccess(`Room ${archivedRoomNumber} archived. You can restore it later.`);
      setIsArchiveConfirmOpen(false);

      window.setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (archiveError) {
      const message = archiveError instanceof Error ? archiveError.message : "Failed to archive room.";
      setError(message);
    } finally {
      setIsArchiving(false);
    }
  };

  const previewName = form.name.trim() || "Untitled Room";
  const previewNumber = form.number.trim() || (initialRoomNumber ? String(initialRoomNumber) : "--");
  const previewType =
    roomTypes.find((entry) => entry.key === form.type)?.label ??
    (form.type ? form.type.charAt(0).toUpperCase() + form.type.slice(1) : "Not selected");
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
        title="Edit Room"
        subtitle="Update room profile and operational defaults."
        statusLabel="LIVE"
        dateTime={dateTime}
      />

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 sm:p-6">
          {isLoading ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-6 text-sm text-[var(--text-secondary)]">
              Loading room details...
            </div>
          ) : (
            <form className="grid grid-cols-1 gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="md:col-span-2 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Room Details</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Edit fields and save to update `huts.json`.
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
                Updates are applied with the room API patch endpoint.
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
                  disabled={roomTypes.length === 0}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
                >
                  {roomTypes.length === 0 ? (
                    <option value="">No room types available</option>
                  ) : null}
                  {roomTypes.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}{type.isActive ? "" : " (Inactive)"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Default Status
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
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
                  placeholder="Example: North Wing"
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
                  type="button"
                  onClick={() => setIsArchiveConfirmOpen(true)}
                  disabled={isSubmitting || isArchiving || initialRoomNumber === null}
                  className="rounded-md border border-[var(--warning)]/40 bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--warning)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Archive Room
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isArchiving}
                  className="rounded-md bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
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
                    Room {previewNumber}
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
          </div>
        </aside>
      </section>

      <ConfirmationModal
        isOpen={isArchiveConfirmOpen}
        title={`Archive Room ${previewNumber}?`}
        description="This room will be moved to the archive. You can restore it later from the archived rooms list."
        confirmLabel="Archive Room"
        cancelLabel="Keep Room"
        tone="primary"
        isLoading={isArchiving}
        onClose={() => {
          if (!isArchiving) {
            setIsArchiveConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          void handleArchiveRoom();
        }}
      />
    </div>
  );
}
