"use client";

import { useEffect, type ReactNode } from "react";

type ConfirmationTone = "danger" | "primary";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const toneStyles: Record<ConfirmationTone, { icon: string; iconBg: string; iconColor: string; confirmButton: string }> = {
  danger: {
    icon: "!",
    iconBg: "var(--danger-soft)",
    iconColor: "var(--danger)",
    confirmButton: "var(--danger)",
  },
  primary: {
    icon: "?",
    iconBg: "var(--hover)",
    iconColor: "var(--accent-blue)",
    confirmButton: "var(--accent-blue)",
  },
};

export function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) {
    return null;
  }

  const style = toneStyles[tone];

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => {
        if (!isLoading) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-[460px] rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 shadow-2xl animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ backgroundColor: style.iconBg, color: style.iconColor }}
          >
            {style.icon}
          </div>
          <div>
            <h3 id="confirmation-modal-title" className="text-[1rem] font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[0.85rem] font-medium text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:opacity-50 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full rounded-lg px-4 py-2 text-[0.85rem] font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
            style={{ backgroundColor: style.confirmButton }}
          >
            {isLoading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
