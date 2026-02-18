"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardHeader } from "../components/DashboardHeader";
import { TutorialChecklist } from "../components/TutorialChecklist";
import { TutorialStepCard } from "../components/TutorialStepCard";
import { useAppState } from "../context/AppContext";

interface TutorialItem {
  step: number;
  title: string;
  description: string;
  steps: string[];
  tip?: string;
  actionLabel?: string;
  actionHref?: string;
}

type TutorialSectionId =
  | "quick_start"
  | "room_monitoring"
  | "room_setup"
  | "logs_cleanup"
  | "common_questions";

interface TutorialSectionMeta {
  id: TutorialSectionId;
  title: string;
  subtitle?: string;
}

const quickStartItems = [
  {
    title: "Open the Rooms page",
    description: "This is your home screen. You will do most daily work here.",
  },
  {
    title: "Pick your Room Map view",
    description: "Switch between By Floor, By Room Type, or All Rooms depending on what you need.",
  },
  {
    title: "Pick dates first",
    description: "Set check-in and check-out dates so room availability is accurate.",
  },
  {
    title: "Set your theme preset",
    description: "Open Settings and apply a light or dark preset that fits your team.",
  },
  {
    title: "Use Logs for history",
    description: "When you need proof of what changed, open Logs and review entries.",
  },
];

const roomViewGuides: TutorialItem[] = [
  {
    step: 1,
    title: "See which rooms are free",
    description: "Start with the Room Map for a quick visual view of all rooms.",
    steps: [
      "Open the Rooms page.",
      "Choose a view mode: By Floor, By Room Type, or All Rooms.",
      "Look at the room cards in the Room Map section.",
      "Click a room card to open its details.",
    ],
    tip: "Use All Rooms when you want one flat list without floor grouping.",
    actionLabel: "Open Rooms",
    actionHref: "/",
  },
  {
    step: 2,
    title: "Filter what you want to see",
    description: "Use filters so you only see rooms that match your date and needs.",
    steps: [
      "Set your check-in and check-out dates.",
      "Choose room type and status if needed.",
      "Click Apply to refresh the list.",
    ],
    tip: "Available means available for the whole date range. Other statuses match any day in range.",
    actionLabel: "Go to Filters",
    actionHref: "/",
  },
  {
    step: 3,
    title: "Check day-by-day availability",
    description: "Use the timeline when availability changes across different dates.",
    steps: [
      "Pick a timeline window: 7 Days, Current Month, or 2 Months.",
      "Scroll to Availability Timeline.",
      "Click one date cell to edit a single day.",
      "Click and drag across dates in one room row to prefill a date range.",
      "Release mouse to open the modal with the range ready.",
    ],
    tip: "Drag range selection is the fastest way to schedule multi-day occupied, maintenance, or cleaning blocks.",
    actionLabel: "Open Timeline",
    actionHref: "/",
  },
];

const roomManagementGuides: TutorialItem[] = [
  {
    step: 4,
    title: "Add a new room",
    description: "Use this when a new room is ready to be managed in the system.",
    steps: [
      "Click Add Room in the sidebar or Room Map.",
      "Fill in room number, name, type, and capacity.",
      "Save room and return to dashboard.",
    ],
    tip: "Room number must be unique. If save fails, check for duplicate number.",
    actionLabel: "Add Room",
    actionHref: "/rooms/new",
  },
  {
    step: 5,
    title: "Edit room details",
    description: "Update room name, type, zone, or default status from the edit page.",
    steps: [
      "Open any room, then click Edit Room.",
      "Update the fields you need.",
      "Click Save Changes.",
    ],
    tip: "Use zone names that your team already uses, so everyone understands quickly.",
    actionLabel: "Back to Rooms",
    actionHref: "/",
  },
  {
    step: 6,
    title: "Archive a room safely",
    description: "Archive when a room is retired or entered by mistake. You can restore it later.",
    steps: [
      "Open the room's Edit page.",
      "Click Archive Room.",
      "Confirm in the popup to move it to the archive.",
    ],
    tip: "Archived rooms can be restored anytime, so nothing is lost permanently.",
    actionLabel: "Manage Rooms",
    actionHref: "/",
  },
  {
    step: 7,
    title: "Adjust theme presets",
    description: "Use Settings to switch appearance presets for better readability.",
    steps: [
      "Open Settings from the sidebar.",
      "Click Apply on a preset you want to use.",
      "Use Edit if you want to adjust the preset colors.",
      "Save changes to keep your custom theme.",
    ],
    tip: "Theme presets change colors only. Keep one team standard to avoid confusion during shifts.",
    actionLabel: "Open Settings",
    actionHref: "/settings",
  },
];

const logsGuides: TutorialItem[] = [
  {
    step: 8,
    title: "Review activity history",
    description: "Logs show what was changed, when it was changed, and which room it affected.",
    steps: [
      "Open Logs from the sidebar.",
      "Read the latest entries at the top.",
      "Use the summary boxes to quickly spot trends.",
    ],
    tip: "Logs help during handovers and shift changes.",
    actionLabel: "Open Logs",
    actionHref: "/logs",
  },
  {
    step: 9,
    title: "Archive or clean up logs",
    description: "Move old records to the archive when needed using bulk actions in Logs.",
    steps: [
      "Select specific rows if you only want to archive a few entries.",
      "Click Archive Selected, or choose Archive All.",
      "Confirm in the modal popup.",
      "Switch to the Archived tab to restore or permanently delete entries.",
    ],
    tip: "Archive first, then permanently delete only when you are sure the history is no longer needed.",
    actionLabel: "Go to Logs",
    actionHref: "/logs",
  },
];

const tutorialSections: TutorialSectionMeta[] = [
  {
    id: "quick_start",
    title: "Quick Start in Under 2 Minutes",
    subtitle: "If this is your first time, follow these first.",
  },
  {
    id: "room_monitoring",
    title: "Room Monitoring",
    subtitle: "Use these steps to filter rooms, switch map views, and update schedule status by date.",
  },
  {
    id: "room_setup",
    title: "Room Setup and Changes",
    subtitle: "Use these when adding rooms, editing details, or removing rooms.",
  },
  {
    id: "logs_cleanup",
    title: "Logs and Cleanup",
    subtitle: "Keep history readable and remove entries safely when needed.",
  },
  {
    id: "common_questions",
    title: "Common Questions",
  },
];

function renderTutorialCard(item: TutorialItem) {
  return (
    <TutorialStepCard
      key={item.step}
      step={item.step}
      title={item.title}
      description={item.description}
      steps={item.steps}
      tip={item.tip}
      action={
        item.actionHref && item.actionLabel ? (
          <Link
            href={item.actionHref}
            className="inline-flex items-center rounded-lg bg-[var(--accent-blue)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            {item.actionLabel}
          </Link>
        ) : null
      }
    />
  );
}

export default function TutorialPage() {
  const { dateTime } = useAppState();
  const [activeSection, setActiveSection] = useState<TutorialSectionId>("quick_start");

  const activeIndex = useMemo(
    () => tutorialSections.findIndex((section) => section.id === activeSection),
    [activeSection],
  );
  const currentSection = tutorialSections[Math.max(0, activeIndex)] ?? tutorialSections[0];

  const moveSection = (direction: "prev" | "next") => {
    const delta = direction === "next" ? 1 : -1;
    const nextIndex = Math.min(
      tutorialSections.length - 1,
      Math.max(0, Math.max(0, activeIndex) + delta),
    );
    setActiveSection(tutorialSections[nextIndex].id);
  };

  const renderActiveSectionContent = () => {
    if (activeSection === "quick_start") {
      return <TutorialChecklist items={quickStartItems} />;
    }

    if (activeSection === "room_monitoring") {
      return (
        <div className="grid gap-3">
          {roomViewGuides.map((item) => renderTutorialCard(item))}
        </div>
      );
    }

    if (activeSection === "room_setup") {
      return (
        <div className="grid gap-3">
          {roomManagementGuides.map((item) => renderTutorialCard(item))}
        </div>
      );
    }

    if (activeSection === "logs_cleanup") {
      return (
        <div className="grid gap-3">
          {logsGuides.map((item) => renderTutorialCard(item))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            Why does room status sometimes look different by date?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            The timeline uses schedule dates. A room can be available today and occupied tomorrow.
            That is normal behavior.
          </p>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            What should I check first when filters show no rooms?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Check date range first, then room type. If still empty, click Reset and apply again.
          </p>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            I changed a room schedule. Why does it not update right away?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Wait a moment and refresh once. If it still does not update, open the room again and check
            that the date range and status were saved correctly.
          </p>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            Which dates should I use for check-in and check-out filters?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Use your guest arrival date as check-in and departure date as check-out. This helps you see
            rooms that match that exact stay period.
          </p>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            Can I undo archiving a room or archiving logs?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Yes. Archived items can be restored from their respective archive tabs. Only permanent
            deletion cannot be undone, so always check the archive first.
          </p>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            When should I use the timeline instead of the room map?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Use the room map for quick room lookup. Use the timeline when status changes day by day,
            such as occupied for a short date range.
          </p>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            Which Room Map view should I use?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Use By Floor for operations by level, By Room Type for inventory balance checks, and All
            Rooms when you want one continuous list without groups.
          </p>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            How do I schedule multiple dates quickly from the timeline?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Click and drag across dates in the same room row, then release. The room modal opens with
            the date range prefilled so you can set one status for the full range.
          </p>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold sm:text-sm">
            What is the safest way to clean up logs?
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            Start with Archive Selected for specific entries. Switch to the Archived tab to review
            before permanently deleting. Use Delete All in archive only when you are sure the whole
            history can be cleared.
          </p>
        </details>
      </div>
    );
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-4 pt-14 sm:p-6 md:pt-6">
      <DashboardHeader
        title="App Tutorial"
        subtitle="Simple step-by-step guide for daily room operations."
        statusLabel="GUIDE"
        dateTime={dateTime}
      />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold sm:text-xl">Start Here</h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
              This page explains each feature in plain language. No technical terms, just practical
              steps you can follow during real operations.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">1.</span> Pick a section
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">2.</span> Open one step
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">3.</span> Try it in app
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex w-full justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--hover)] sm:w-auto"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Tutorial Navigation
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => moveSection("prev")}
              disabled={Math.max(0, activeIndex) === 0}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => moveSection("next")}
              disabled={Math.max(0, activeIndex) === tutorialSections.length - 1}
              className="rounded-md bg-[var(--accent-blue)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {tutorialSections.map((section, index) => {
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[var(--accent-blue)] text-white"
                      : "border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {index + 1}. {section.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5">
          <h2 className="text-base font-semibold sm:text-lg">{currentSection.title}</h2>
          {currentSection.subtitle ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">
              {currentSection.subtitle}
            </p>
          ) : null}
          <div className="mt-4">{renderActiveSectionContent()}</div>
        </div>
      </section>
    </div>
  );
}
