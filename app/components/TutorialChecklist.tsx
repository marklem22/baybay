interface TutorialChecklistItem {
  title: string;
  description: string;
}

interface TutorialChecklistProps {
  title?: string;
  subtitle?: string;
  items: TutorialChecklistItem[];
}

export function TutorialChecklist({ title, subtitle, items }: TutorialChecklistProps) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
      {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
      {subtitle ? (
        <p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">{subtitle}</p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[0.7rem] font-semibold text-[var(--success)]">
                {index + 1}
              </span>
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-primary)] sm:text-sm">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
