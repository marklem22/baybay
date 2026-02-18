"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Palette, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAppState, type ThemeColors, type ThemePreset, type ThemeSettings } from "../context/AppContext";
import { BUILT_IN_THEME_PRESETS_BY_ID } from "../lib/builtInThemePresets";

const COLOR_LABELS: { key: keyof ThemeColors; label: string; group: string }[] = [
  { key: "bgPrimary", label: "Background", group: "Backgrounds" },
  { key: "bgSecondary", label: "Secondary BG", group: "Backgrounds" },
  { key: "bgCard", label: "Card BG", group: "Backgrounds" },
  { key: "textPrimary", label: "Primary Text", group: "Text" },
  { key: "textSecondary", label: "Secondary Text", group: "Text" },
  { key: "textMuted", label: "Muted Text", group: "Text" },
  { key: "accentBlue", label: "Accent Blue", group: "Accents" },
  { key: "accentPurple", label: "Accent Purple", group: "Accents" },
  { key: "accentCyan", label: "Accent Cyan", group: "Accents" },
  { key: "success", label: "Success / Available", group: "Status" },
  { key: "warning", label: "Warning / Maintenance", group: "Status" },
  { key: "danger", label: "Danger / Occupied", group: "Status" },
];

const GROUPS = ["Backgrounds", "Text", "Accents", "Status"];

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [inputValue, setInputValue] = useState(value);

  // Update inputValue if external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className="flex items-center gap-3">
      <label className="relative cursor-pointer">
        <input
          type="color"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setInputValue(e.target.value);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="h-9 w-9 rounded-lg border border-[var(--border)] shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: value }}
        />
      </label>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            setInputValue(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              onChange(v);
            }
          }}
          className="w-24 rounded border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent-blue)]"
        />
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  isActive,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  onReset,
}: {
  preset: ThemePreset;
  isActive: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  const colorKeys: (keyof ThemeColors)[] = [
    "bgPrimary", "accentBlue", "success", "danger", "warning", "accentCyan",
  ];

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        isActive
          ? "border-[var(--accent-blue)] shadow-lg shadow-[var(--accent-blue)]/20"
          : "border-[var(--border)] hover:border-[var(--text-muted)]"
      }`}
      style={{ backgroundColor: preset.colors.bgSecondary }}
    >
      {/* Color preview strip */}
      <div className="flex h-8">
        {colorKeys.map((k) => (
          <div key={k} className="flex-1" style={{ backgroundColor: preset.colors[k] }} />
        ))}
      </div>

      <div className="p-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: preset.colors.textPrimary }}>
            {preset.name}
          </span>
          {isActive && (
            <span className="rounded-full bg-[var(--accent-blue)] px-2 py-0.5 text-[0.6rem] font-bold uppercase text-white">
              Active
            </span>
          )}
        </div>
        {/* Actions */}
        <div className="mt-2 flex items-center gap-1.5">
          {!isActive && (
            <button
              type="button"
              onClick={onApply}
              className="flex items-center gap-1 rounded-md bg-[var(--accent-blue)] px-2 py-1 text-[0.7rem] font-medium text-white transition-colors hover:brightness-110"
            >
              <Check size={12} /> Apply
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            title="Edit preset"
            className="rounded-md border border-[var(--border)] p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate preset"
            className="rounded-md border border-[var(--border)] p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
          >
            <Copy size={12} />
          </button>
          {preset.isBuiltIn && (
            <button
              type="button"
              onClick={onReset}
              title="Reset preset colors"
              className="rounded-md border border-[var(--border)] p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              <RotateCcw size={12} />
            </button>
          )}
          {!preset.isBuiltIn && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete preset"
              className="rounded-md border border-[var(--border)] p-1 text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { themeSettings, handleUpdateSettings, handleApplyPreset, setToast } =
    useAppState();

  const [editingPreset, setEditingPreset] = useState<ThemePreset | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Sort presets: built-in first, then custom
  const sortedPresets = useMemo(() => {
    if (!themeSettings) return [];
    return [...themeSettings.presets].sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [themeSettings]);

  const handleApply = useCallback(
    (presetId: string) => {
      if (!themeSettings) return;
      handleApplyPreset(presetId);
      void handleUpdateSettings({ ...themeSettings, activePreset: presetId });
    },
    [themeSettings, handleApplyPreset, handleUpdateSettings],
  );

  const handleStartEdit = useCallback((preset: ThemePreset) => {
    setEditingPreset({ ...preset, colors: { ...preset.colors } });
    setIsCreating(false);
  }, []);

  const handleDuplicate = useCallback(
    (preset: ThemePreset) => {
      const newPreset: ThemePreset = {
        ...preset,
        id: `custom-${Date.now()}`,
        name: `${preset.name} (Copy)`,
        isBuiltIn: false,
        colors: { ...preset.colors },
      };
      setEditingPreset(newPreset);
      setIsCreating(true);
    },
    [],
  );

  const handleDelete = useCallback(
    (presetId: string) => {
      if (!themeSettings) return;
      const updated: ThemeSettings = {
        ...themeSettings,
        presets: themeSettings.presets.filter((p) => p.id !== presetId),
        activePreset:
          themeSettings.activePreset === presetId ? "default-light" : themeSettings.activePreset,
      };
      if (themeSettings.activePreset === presetId) {
        const fallback = updated.presets.find((p) => p.id === "default-light");
        if (fallback) handleApplyPreset("default-light");
      }
      void handleUpdateSettings(updated);
    },
    [themeSettings, handleUpdateSettings, handleApplyPreset],
  );

  const handleResetPreset = useCallback(
    (presetId: string) => {
      if (!themeSettings) return;
      const original = BUILT_IN_THEME_PRESETS_BY_ID[presetId];
      if (!original) {
        setToast("Only built-in presets can be reset.");
        return;
      }

      const updated: ThemeSettings = {
        ...themeSettings,
        presets: themeSettings.presets.map((preset) =>
          preset.id === presetId ? { ...original, colors: { ...original.colors } } : preset,
        ),
      };

      void handleUpdateSettings(updated);
      setToast(`Reset "${original.name}" to its original palette.`);
    },
    [themeSettings, handleUpdateSettings, setToast],
  );

  const handleCreateNew = useCallback(() => {
    const base: ThemePreset = {
      id: `custom-${Date.now()}`,
      name: "My Theme",
      isBuiltIn: false,
      colors: {
        bgPrimary: "#0c0e14",
        bgSecondary: "#13151d",
        bgCard: "#1a1d28",
        accentBlue: "#6366f1",
        accentPurple: "#8b5cf6",
        accentCyan: "#06b6d4",
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
        textPrimary: "#f1f5f9",
        textSecondary: "#94a3b8",
        textMuted: "#64748b",
      },
      font: "Inter",
    };
    setEditingPreset(base);
    setIsCreating(true);
  }, []);

  const handleEditorColorChange = useCallback(
    (key: keyof ThemeColors, value: string) => {
      setEditingPreset((prev) => {
        if (!prev) return prev;
        return { ...prev, colors: { ...prev.colors, [key]: value } };
      });
    },
    [],
  );

  const handleEditorNameChange = useCallback((name: string) => {
    setEditingPreset((prev) => {
      if (!prev) return prev;
      return { ...prev, name };
    });
  }, []);

  const handleSaveEditor = useCallback(() => {
    if (!themeSettings || !editingPreset) return;
    if (!editingPreset.name.trim()) {
      setToast("Please enter a preset name");
      return;
    }

    let updated: ThemeSettings;
    if (isCreating) {
      updated = {
        ...themeSettings,
        presets: [...themeSettings.presets, editingPreset],
        activePreset: editingPreset.id,
      };
    } else {
      updated = {
        ...themeSettings,
        presets: themeSettings.presets.map((p) =>
          p.id === editingPreset.id ? editingPreset : p,
        ),
      };
    }

    void handleUpdateSettings(updated);
    handleApplyPreset(editingPreset.id);
    setEditingPreset(null);
    setIsCreating(false);
  }, [themeSettings, editingPreset, isCreating, handleUpdateSettings, handleApplyPreset, setToast]);

  const handlePreviewEditor = useCallback(() => {
    if (!editingPreset) return;
    // Temporarily apply without saving
    const tempPreset = editingPreset;
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      const c = tempPreset.colors;
      const hexToRgb = (hex: string) => {
        const r = Number.parseInt(hex.slice(1, 3), 16);
        const g = Number.parseInt(hex.slice(3, 5), 16);
        const b = Number.parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
      };
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
      root.style.setProperty("--success-soft", `rgba(${hexToRgb(c.success)}, 0.1)`);
      root.style.setProperty("--danger-soft", `rgba(${hexToRgb(c.danger)}, 0.1)`);
      root.style.setProperty("--warning-soft", `rgba(${hexToRgb(c.warning)}, 0.1)`);
      root.style.setProperty("--accent-cyan-soft", `rgba(${hexToRgb(c.accentCyan)}, 0.1)`);
      root.style.setProperty("--hover", `rgba(${hexToRgb(c.accentBlue)}, 0.08)`);
      root.style.setProperty("--border", `rgba(${hexToRgb(c.textSecondary)}, 0.08)`);
    }
    setToast("Previewing — save to keep changes");
  }, [editingPreset, setToast]);

  const handleResetEditor = useCallback(() => {
    if (!themeSettings) return;
    // Re-apply current active preset
    handleApplyPreset(themeSettings.activePreset);
    setEditingPreset(null);
    setIsCreating(false);
  }, [themeSettings, handleApplyPreset]);

  if (!themeSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-[var(--text-muted)]">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--text-muted)]">Customize your dashboard appearance</p>
        </div>
      </div>

      {/* Preset Editor (when editing) */}
      {editingPreset ? (
        <div className="animate-fade-in space-y-6">
          {/* Editor header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-3">
              <Palette size={20} className="text-[var(--accent-blue)]" />
              <input
                type="text"
                value={editingPreset.name}
                onChange={(e) => handleEditorNameChange(e.target.value)}
                placeholder="Preset name..."
                className="bg-transparent text-lg font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewEditor}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
              >
                <Palette size={14} /> Preview
              </button>
              <button
                type="button"
                onClick={handleResetEditor}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
              >
                <RotateCcw size={14} /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditor}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-blue)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:brightness-110"
              >
                <Save size={14} /> Save
              </button>
            </div>
          </div>

          {/* Color groups */}
          {GROUPS.map((group) => {
            const cols = COLOR_LABELS.filter((c) => c.group === group);
            return (
              <div
                key={group}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
              >
                <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{group}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cols.map((c) => (
                    <ColorInput
                      key={c.key}
                      label={c.label}
                      value={editingPreset.colors[c.key]}
                      onChange={(v) => handleEditorColorChange(c.key, v)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Preview swatch */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Preview</h3>
            <div
              className="overflow-hidden rounded-lg border"
              style={{
                backgroundColor: editingPreset.colors.bgPrimary,
                borderColor: `${editingPreset.colors.textSecondary}20`,
              }}
            >
              <div
                className="border-b p-3"
                style={{
                  backgroundColor: editingPreset.colors.bgSecondary,
                  borderColor: `${editingPreset.colors.textSecondary}15`,
                }}
              >
                <span className="text-sm font-semibold" style={{ color: editingPreset.colors.textPrimary }}>
                  Dashboard Preview
                </span>
              </div>
              <div className="p-4">
                <div className="mb-3 flex gap-2">
                  {(["success", "danger", "warning", "accentCyan", "accentBlue", "accentPurple"] as const).map(
                    (k) => (
                      <div
                        key={k}
                        className="h-6 flex-1 rounded"
                        style={{ backgroundColor: editingPreset.colors[k] }}
                      />
                    ),
                  )}
                </div>
                <p className="mb-1 text-sm" style={{ color: editingPreset.colors.textPrimary }}>
                  Primary text sample
                </p>
                <p className="mb-1 text-xs" style={{ color: editingPreset.colors.textSecondary }}>
                  Secondary text sample
                </p>
                <p className="text-xs" style={{ color: editingPreset.colors.textMuted }}>
                  Muted helper text
                </p>
                <div className="mt-3 flex gap-2">
                  <div
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: editingPreset.colors.accentBlue }}
                  >
                    Button
                  </div>
                  <div
                    className="rounded-md border px-3 py-1.5 text-xs font-medium"
                    style={{
                      borderColor: `${editingPreset.colors.textSecondary}30`,
                      color: editingPreset.colors.textSecondary,
                      backgroundColor: editingPreset.colors.bgCard,
                    }}
                  >
                    Secondary
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Preset Gallery */
        <div className="space-y-6">
          {/* Section header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-[var(--accent-blue)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Theme Presets</h2>
            </div>
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
            >
              <Plus size={14} /> New Theme
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isActive={themeSettings.activePreset === preset.id}
                onApply={() => handleApply(preset.id)}
                onEdit={() => handleStartEdit(preset)}
                onDuplicate={() => handleDuplicate(preset)}
                onDelete={() => handleDelete(preset.id)}
                onReset={() => handleResetPreset(preset.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
