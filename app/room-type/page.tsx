"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { DashboardHeader } from "../components/DashboardHeader";
import { useAppState } from "../context/AppContext";
import type { RoomTypeWithUsage } from "../lib/roomData";

interface RoomTypeFormState {
  key: string;
  label: string;
  description: string;
  defaultCapacity: string;
  amenities: string;
  isActive: boolean;
}

const emptyForm: RoomTypeFormState = {
  key: "",
  label: "",
  description: "",
  defaultCapacity: "1",
  amenities: "",
  isActive: true,
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toFormState(roomType: RoomTypeWithUsage): RoomTypeFormState {
  return {
    key: roomType.key,
    label: roomType.label,
    description: roomType.description ?? "",
    defaultCapacity: String(roomType.defaultCapacity),
    amenities: roomType.amenities.join(", "),
    isActive: roomType.isActive,
  };
}

export default function RoomTypePage() {
  const { dateTime, setToast } = useAppState();
  const [roomTypes, setRoomTypes] = useState<RoomTypeWithUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState<RoomTypeFormState>(emptyForm);
  const [keyEditedManually, setKeyEditedManually] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoomTypeWithUsage | null>(null);

  const isEditing = selectedKey !== null;
  const selectedType = useMemo(
    () => roomTypes.find((entry) => entry.key === selectedKey) ?? null,
    [roomTypes, selectedKey],
  );

  const stats = useMemo(() => {
    const activeCount = roomTypes.filter((entry) => entry.isActive).length;
    const inactiveCount = roomTypes.length - activeCount;
    const inUseCount = roomTypes.filter((entry) => entry.usageCount > 0).length;
    return { total: roomTypes.length, activeCount, inactiveCount, inUseCount };
  }, [roomTypes]);

  const loadRoomTypes = useCallback(async (selectionKey: string | null) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/room-types", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Load failed with status ${response.status}`);
      }

      const payload = (await response.json()) as RoomTypeWithUsage[];
      const nextTypes = Array.isArray(payload) ? payload : [];
      setRoomTypes(nextTypes);

      if (selectionKey) {
        const updatedSelection = nextTypes.find((entry) => entry.key === selectionKey);
        if (updatedSelection) {
          setForm(toFormState(updatedSelection));
        } else {
          setSelectedKey(null);
          setForm(emptyForm);
          setKeyEditedManually(false);
        }
      }
    } catch (loadError) {
      console.error("Failed to load room types", loadError);
      setError("Could not load room types.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoomTypes(null);
  }, [loadRoomTypes]);

  const handleCreateMode = () => {
    setSelectedKey(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
    setKeyEditedManually(false);
  };

  const handleSelectType = (roomType: RoomTypeWithUsage) => {
    setSelectedKey(roomType.key);
    setForm(toFormState(roomType));
    setError(null);
    setSuccess(null);
    setKeyEditedManually(true);
  };

  const handleChange = (field: keyof RoomTypeFormState, value: string | boolean) => {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (!isEditing && field === "label" && !keyEditedManually) {
        next.key = slugify(String(value));
      }

      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.label.trim().length === 0) {
      setError("Room type label is required.");
      return;
    }

    if (!isEditing && form.key.trim().length === 0) {
      setError("Room type key is required.");
      return;
    }

    const defaultCapacity = Number(form.defaultCapacity);
    if (!Number.isInteger(defaultCapacity) || defaultCapacity <= 0) {
      setError("Default capacity must be a positive whole number.");
      return;
    }

    const amenities = form.amenities
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setIsSubmitting(true);

    try {
      const endpoint = isEditing ? `/api/room-types/${selectedKey}` : "/api/room-types";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? {} : { key: form.key }),
          label: form.label.trim(),
          description: form.description.trim(),
          defaultCapacity,
          amenities,
          isActive: form.isActive,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save room type.");
      }

      const saved = (await response.json()) as RoomTypeWithUsage;
      setSuccess(isEditing ? `Updated ${saved.label}.` : `Created ${saved.label}.`);
      setToast(isEditing ? `Room type updated: ${saved.label}` : `Room type created: ${saved.label}`);
      setSelectedKey(saved.key);
      setForm(toFormState(saved));
      setKeyEditedManually(true);
      await loadRoomTypes(saved.key);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save room type.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/room-types/${deleteTarget.key}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to delete room type.");
      }

      setToast(`Room type deleted: ${deleteTarget.label}`);
      setSuccess(`Deleted ${deleteTarget.label}.`);
      setDeleteTarget(null);
      if (selectedKey === deleteTarget.key) {
        setSelectedKey(null);
        setForm(emptyForm);
        setKeyEditedManually(false);
      }
      await loadRoomTypes(null);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete room type.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-4 pt-14 sm:p-6 md:pt-6">
      <DashboardHeader
        title="Room Type Management"
        subtitle="Create, update, and maintain room type definitions used by room records."
        statusLabel="LIVE"
        dateTime={dateTime}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--text-secondary)]">Total Types</p>
          <p className="mt-1 text-[1.5rem] font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--text-secondary)]">Active</p>
          <p className="mt-1 text-[1.5rem] font-bold text-[var(--success)]">{stats.activeCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--text-secondary)]">Inactive</p>
          <p className="mt-1 text-[1.5rem] font-bold text-[var(--warning)]">{stats.inactiveCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--text-secondary)]">In Use</p>
          <p className="mt-1 text-[1.5rem] font-bold text-[var(--accent-blue)]">{stats.inUseCount}</p>
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{isEditing ? "Edit Room Type" : "Create Room Type"}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {isEditing
                  ? "Update room type details used by room forms and filters."
                  : "Define a new room type with default capacity and amenities."}
              </p>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleCreateMode}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)]"
                >
                  New Type
                </button>
              ) : null}
              <Link
                href="/rooms/new"
                className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)]"
              >
                Add Room
              </Link>
            </div>
          </div>

          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Type Key
              </span>
              <input
                type="text"
                value={form.key}
                onChange={(event) => {
                  handleChange("key", slugify(event.target.value));
                  setKeyEditedManually(true);
                }}
                disabled={isEditing}
                placeholder="e.g. family-suite"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)] disabled:opacity-60"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Display Label
              </span>
              <input
                type="text"
                value={form.label}
                onChange={(event) => handleChange("label", event.target.value)}
                placeholder="e.g. Family Suite"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Default Capacity
              </span>
              <input
                type="number"
                min={1}
                value={form.defaultCapacity}
                onChange={(event) => handleChange("defaultCapacity", event.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
                required
              />
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => handleChange("isActive", event.target.checked)}
                className="h-4 w-4 accent-[var(--accent-blue)]"
              />
              <span className="text-[var(--text-primary)]">Active in room forms</span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Description
              </span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="What this room type is best for."
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Amenities (comma separated)
              </span>
              <input
                type="text"
                value={form.amenities}
                onChange={(event) => handleChange("amenities", event.target.value)}
                placeholder="Wi-Fi, Balcony, Mini Bar"
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
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedType) setDeleteTarget(selectedType);
                  }}
                  className="rounded-md border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--danger)] transition hover:opacity-90"
                >
                  Delete Type
                </button>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Type"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Defined Room Types</h2>
            <button
              type="button"
              onClick={() => void loadRoomTypes(selectedKey)}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)]"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-6 text-sm text-[var(--text-secondary)]">
              Loading room types...
            </div>
          ) : roomTypes.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-6 text-sm text-[var(--text-secondary)]">
              No room types defined yet.
            </div>
          ) : (
            <div className="space-y-3">
              {roomTypes.map((entry) => {
                const isSelected = selectedKey === entry.key;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => handleSelectType(entry)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10"
                        : "border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{entry.label}</p>
                        <p className="mt-0.5 font-mono text-[0.68rem] text-[var(--text-muted)]">{entry.key}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[0.68rem] font-medium text-[var(--text-secondary)]">
                          {entry.usageCount} room{entry.usageCount === 1 ? "" : "s"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.68rem] font-medium ${
                            entry.isActive
                              ? "bg-[var(--success-soft)] text-[var(--success)]"
                              : "bg-[var(--warning)]/20 text-[var(--warning)]"
                          }`}
                        >
                          {entry.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    {entry.description ? (
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">{entry.description}</p>
                    ) : null}

                    <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1.5">
                        Default Capacity:{" "}
                        <span className="font-medium text-[var(--text-primary)]">{entry.defaultCapacity}</span>
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1.5">
                        Updated:{" "}
                        <span className="font-medium text-[var(--text-primary)]">{formatDate(entry.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[0.74rem] text-[var(--text-secondary)]">
                      Amenities:{" "}
                      <span className="font-medium text-[var(--text-primary)]">
                        {entry.amenities.length > 0 ? entry.amenities.join(", ") : "None listed"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget ? `Delete "${deleteTarget.label}"?` : "Delete room type?"}
        description={
          deleteTarget
            ? deleteTarget.usageCount > 0
              ? `This type is still used by ${deleteTarget.usageCount} room(s) and cannot be deleted.`
              : "This action cannot be undone."
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        isLoading={isSubmitting}
        onConfirm={() => {
          if (deleteTarget?.usageCount) {
            setDeleteTarget(null);
            setError("This room type is still assigned to one or more rooms.");
            return;
          }
          void handleDelete();
        }}
        onClose={() => {
          if (!isSubmitting) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
