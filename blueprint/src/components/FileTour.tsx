"use client";

/**
 * Source pattern: the "PR writeup" reference (thariqs.github.io/html-effectiveness/17-pr-writeup.html).
 * Generation prompt:
 *   "Write up PR #312 for my reviewers. Explain the motivation, walk them through the
 *    change file by file with the why for each, show before/after behavior, and tell
 *    them exactly where to focus."
 * This FileTour component covers the "file by file with the why for each" section. It also
 * doubles as a concept walkthrough: entries that omit `change`/`added`/`removed`
 * render as a plain term → definition → example row (the former ConceptExplainer).
 */
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChangeType = "added" | "modified" | "removed";

interface FileEntry {
  /** A file path (file mode) or a concept term (concept mode). */
  path: string;
  /** The prose: why the file changed, or the definition of the term. */
  summary: string;
  /** Omit for concept mode — the NEW/MOD/DEL badge is only shown when set. */
  change?: ChangeType;
  added?: number;
  removed?: number;
  /** Optional snippet or example. */
  code?: string;
  /** Shiki language for `code` (default "tsx"). */
  lang?: string;
}

interface FileTourProps {
  files: FileEntry[];
}

const badgeLabel: Record<ChangeType, string> = {
  added: "NEW",
  modified: "MOD",
  removed: "DEL",
};

const badgeClassName: Record<ChangeType, string> = {
  added: "bg-chart-2/15 text-chart-2 border-transparent",
  modified: "text-primary",
  removed: "text-destructive",
};

export function FileTour({ files }: FileTourProps) {
  return (
    <Card className="gap-0 py-0">
      <Accordion type="multiple">
        {files.map((file, index) => (
          <AccordionItem
            key={`${file.path}-${index}`}
            value={`${file.path}-${index}`}
            className="px-4"
          >
            <AccordionTrigger>
              <span className="flex flex-1 items-center justify-between gap-3 pr-3">
                <span className="font-mono text-sm">{file.path}</span>
                <span className="flex items-center gap-2">
                  {file.change && (
                    <Badge
                      variant="outline"
                      className={cn(badgeClassName[file.change])}
                    >
                      {badgeLabel[file.change]}
                    </Badge>
                  )}
                  {(file.added != null || file.removed != null) && (
                    <span className="font-mono text-xs">
                      {file.added != null && (
                        <span className="text-chart-2">+{file.added}</span>
                      )}
                      {file.added != null && file.removed != null && " "}
                      {file.removed != null && (
                        <span className="text-destructive">
                          −{file.removed}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">{file.summary}</p>
              {file.code && (
                <div className="mt-3">
                  <DynamicCodeBlock
                    lang={file.lang ?? "tsx"}
                    code={file.code}
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
