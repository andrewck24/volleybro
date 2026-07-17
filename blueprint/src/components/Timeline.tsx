interface TimelineEvent {
  date: string;
  label: string;
  description: string;
  status?: "done" | "pending";
  tags?: string[];
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  return (
    <ol className="list-none">
      {events.map((event, i) => {
        const status = event.status ?? "pending";
        const isLast = i === events.length - 1;

        return (
          <li
            key={i}
            className="grid grid-cols-[auto_auto_1fr] gap-x-4 pb-6 last:pb-0"
          >
            <time className="mt-1.5 w-24 text-right font-mono text-xs text-muted-foreground">
              {event.date}
            </time>

            <div className="relative w-3">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-px bg-border"
                />
              )}
              <span
                aria-hidden
                className={
                  "absolute left-1/2 mt-1.5 size-3 -translate-x-1/2 rounded-full " +
                  (status === "done"
                    ? "bg-primary"
                    : "border-2 border-warning bg-background")
                }
              />
            </div>

            <div>
              <strong className="leading-tight font-semibold text-foreground">
                {event.label}
              </strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {event.description}
              </p>
              {event.tags && event.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
