"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ChangeCard } from "@/components/ChangeCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChangeRecord, ChangeStatus } from "@/lib/change-types";

const STATUS_OPTIONS: Array<{ value: ChangeStatus; label: string }> = [
  { value: "discussing", label: "Discussing" },
  { value: "in-progress", label: "In Progress" },
  { value: "archived", label: "Archive" },
];

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function uniqueValues(changes: ChangeRecord[], key: "capabilities" | "tags") {
  return [...new Set(changes.flatMap((change) => change[key]))].sort();
}

function monthKey(change: ChangeRecord) {
  return (change.archivedAt ?? change.startedAt).slice(0, 7);
}

function monthLabel(key: string) {
  return MONTH_FORMATTER.format(new Date(`${key}-01T00:00:00Z`));
}

export function ChangesCatalog({ changes }: { changes: ChangeRecord[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") as ChangeStatus | null;
  const capability = searchParams.get("capability");
  const tag = searchParams.get("tag");

  function updateFilter(name: string, value?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`);
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return changes.filter((change) => {
      const searchable = [
        change.title,
        change.slug,
        change.summary,
        ...change.capabilities,
        ...change.tags,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!needle || searchable.includes(needle)) &&
        (!status || change.status === status) &&
        (!capability || change.capabilities.includes(capability)) &&
        (!tag || change.tags.includes(tag))
      );
    });
  }, [capability, changes, query, status, tag]);

  const capabilities = uniqueValues(changes, "capabilities");
  const tags = uniqueValues(changes, "tags");
  const archivedByMonth = filtered
    .filter((change) => change.status === "archived")
    .reduce<Record<string, ChangeRecord[]>>((groups, change) => {
      const key = monthKey(change);
      (groups[key] ??= []).push(change);
      return groups;
    }, {});
  const archiveMonths = Object.entries(archivedByMonth).sort(([a], [b]) =>
    b.localeCompare(a),
  );

  return (
    <div className="not-prose flex flex-col gap-8">
      <section aria-label="Change filters" className="flex flex-col gap-4">
        <Input
          aria-label="Search changes"
          placeholder="Search changes, capabilities, or tags"
          value={query}
          onChange={(event) => updateFilter("q", event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!status ? "default" : "outline"}
            onClick={() => updateFilter("status")}
          >
            All
          </Button>
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={status === option.value ? "default" : "outline"}
              onClick={() => updateFilter("status", option.value)}
            >
              {option.label}
            </Button>
          ))}
          {(query || status || capability || tag) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.replace(pathname)}
            >
              Clear filters
            </Button>
          )}
        </div>
        <Accordion type="multiple" className="rounded-lg border px-3">
          <AccordionItem value="capabilities">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                Capabilities{" "}
                <Badge variant="secondary">{capabilities.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-wrap gap-2 pb-3">
              {capabilities.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={capability === value ? "secondary" : "outline"}
                  onClick={() =>
                    updateFilter(
                      "capability",
                      capability === value ? undefined : value,
                    )
                  }
                >
                  {value}
                </Button>
              ))}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="tags">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                Tags <Badge variant="secondary">{tags.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-wrap gap-2 pb-3">
              {tags.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={tag === value ? "secondary" : "outline"}
                  onClick={() =>
                    updateFilter("tag", tag === value ? undefined : value)
                  }
                >
                  {value}
                </Button>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {STATUS_OPTIONS.slice(0, 2).map((section) => {
        const sectionChanges = filtered.filter(
          (change) => change.status === section.value,
        );
        if (sectionChanges.length === 0) return null;
        return (
          <section key={section.value} className="flex flex-col gap-3">
            <h2 className="m-0 text-xl font-semibold">{section.label}</h2>
            {sectionChanges.map((change) => (
              <ChangeCard
                key={change.slug}
                name={change.title}
                date={change.startedAt}
                lifecycle={change.lifecycle}
                summary={change.summary}
                href={change.href}
                capabilities={change.capabilities}
                tags={change.tags}
              />
            ))}
          </section>
        );
      })}

      {archiveMonths.length > 0 && (
        <section id="archive" className="flex scroll-mt-20 flex-col gap-3">
          <h2 className="m-0 text-xl font-semibold">Archive</h2>
          <div className="relative pl-8 before:absolute before:inset-y-3 before:left-3 before:w-px before:bg-border">
            <Accordion
              type="multiple"
              defaultValue={archiveMonths.slice(0, 1).map(([month]) => month)}
            >
              {archiveMonths.map(([month, monthChanges]) => (
                <AccordionItem
                  key={month}
                  value={month}
                  className="relative border-0"
                >
                  <span className="absolute top-5 -left-5 size-2.5 rounded-full border-2 border-background bg-primary" />
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      {monthLabel(month)}
                      <Badge variant="secondary">{monthChanges.length}</Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="flex flex-col gap-3 pb-5">
                    {monthChanges.map((change) => (
                      <ChangeCard
                        key={change.slug}
                        name={change.title}
                        date={change.archivedAt}
                        lifecycle={change.lifecycle}
                        summary={change.summary}
                        href={change.href}
                        capabilities={change.capabilities}
                        tags={change.tags}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <p className="m-0 rounded-lg border p-6 text-sm text-muted-foreground">
          No changes match the current filters.
        </p>
      )}
    </div>
  );
}
