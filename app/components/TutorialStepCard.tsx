import type { ReactNode } from "react";

interface TutorialStepCardProps {
  step: number;
  title: string;
  description: string;
  steps: string[];
  tip?: string;
  action?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function TutorialStepCard({
  step,
  title,
  description,
  steps,
  tip,
  action,
  collapsible = false,
  defaultOpen = false,
}: TutorialStepCardProps) {
  const content = (
    <>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
        <p className="text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
          {description}
        </p>
      </div>

      <ol className="mt-3 space-y-2">
        {steps.map((line, index) => (
          <li
            key={line}
            className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5"
          >
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)]/15 text-[0.65rem] font-semibold text-[var(--accent-blue)]">
              {index + 1}
            </span>
            <span className="text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">{line}</span>
          </li>
        ))}
      </ol>

      {tip ? (
        <div className="mt-3 rounded-lg border border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan-soft)] px-3 py-2 text-xs text-[var(--text-primary)]">
          <span className="font-semibold text-[var(--accent-cyan)]">Tip:</span> {tip}
        </div>
      ) : null}

      {action ? <div className="mt-3">{action}</div> : null}
    </>
  );

  if (collapsible) {
    return (
      <details
        open={defaultOpen}
        className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]"
      >
        <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-blue)]/15 text-sm font-semibold text-[var(--accent-blue)]">
            {step}
          </div>
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Step {step}
            </p>
            <h3 className="mt-0.5 text-sm font-semibold sm:text-base">{title}</h3>
          </div>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition group-open:rotate-180">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </summary>
        <div className="border-t border-[var(--border)] p-4 pt-3 sm:p-5 sm:pt-4">{content}</div>
      </details>
    );
  }

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-blue)]/15 text-sm font-semibold text-[var(--accent-blue)]">
          {step}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Step {step}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold sm:text-base">{title}</h3>
          <div className="mt-3">{content}</div>
        </div>
      </div>
    </article>
  );
}
