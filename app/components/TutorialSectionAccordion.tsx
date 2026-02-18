import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface TutorialSectionAccordionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function TutorialSectionAccordion({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: TutorialSectionAccordionProps) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle ? (
            <p className="mt-1 hidden text-xs text-[var(--text-secondary)] sm:text-sm group-open:block">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition group-open:rotate-180">
          <ChevronDown size={14} />
        </span>
      </summary>

      <div className="border-t border-[var(--border)] p-3 sm:p-4">{children}</div>
    </details>
  );
}
