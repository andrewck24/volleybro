import {
  Code,
  FileText,
  GitCommitHorizontal,
  ListChecks,
  Minus,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ChangeFacts } from "@/lib/change-meta";
import { cn } from "@/lib/utils";

type Figure = {
  key: string;
  value: number | null | undefined;
  text: (value: number) => string;
  Icon: LucideIcon;
  className: string;
  srLabel?: string;
};

const plural = (value: number, unit: string) =>
  `${value} ${unit}${value === 1 ? "" : "s"}`;

// Each figure carries its own icon, so its colour is a cue rather than the
// only thing telling additions from deletions. The status tones are too
// light for small text in the light theme, so the text mixes in foreground.
const figuresOf = (facts: ChangeFacts): Figure[] => [
  {
    key: "commits",
    value: facts.commits,
    text: (value) => plural(value, "commit"),
    Icon: GitCommitHorizontal,
    className:
      "border-info/40 bg-info/10 text-[color-mix(in_oklch,var(--info)_65%,var(--foreground))]",
  },
  {
    key: "files",
    value: facts.filesChanged,
    text: (value) => plural(value, "file"),
    Icon: FileText,
    className: "border-border bg-muted text-foreground",
  },
  {
    key: "insertions",
    value: facts.insertions,
    text: (value) => `${value}`,
    Icon: Plus,
    srLabel: "lines added",
    className:
      "border-success/40 bg-success/10 text-[color-mix(in_oklch,var(--success)_65%,var(--foreground))]",
  },
  {
    key: "deletions",
    value: facts.deletions,
    text: (value) => `${value}`,
    Icon: Minus,
    srLabel: "lines removed",
    className:
      "border-destructive/40 bg-destructive/10 text-[color-mix(in_oklch,var(--destructive)_65%,var(--foreground))]",
  },
  {
    key: "src",
    value: facts.srcFilesChanged,
    text: (value) => plural(value, "src file"),
    Icon: Code,
    className:
      "border-warning/40 bg-warning/10 text-[color-mix(in_oklch,var(--warning)_65%,var(--foreground))]",
  },
  {
    key: "scenarios",
    value: facts.scenarios,
    text: (value) => plural(value, "scenario"),
    Icon: ListChecks,
    className: "border-border bg-transparent text-muted-foreground",
  },
];

export function FigureBadges({
  facts,
  className,
}: {
  facts: ChangeFacts;
  className?: string;
}) {
  const shown = figuresOf(facts).filter((figure) => figure.value);
  if (shown.length === 0) return null;
  return (
    <ul
      aria-label="Change figures"
      className={cn("m-0 flex list-none flex-wrap gap-1.5 p-0", className)}
    >
      {shown.map(({ key, value, text, Icon, className: tone, srLabel }) => (
        <li key={key} className="m-0 p-0">
          <Badge
            variant="outline"
            className={cn("gap-1 whitespace-nowrap tabular-nums", tone)}
          >
            <Icon aria-hidden="true" />
            {text(value as number)}
            {srLabel && <span className="sr-only">{srLabel}</span>}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
