import React from "react";

import { cn } from "@/lib/utils";

interface Annotation {
  line: number;
  note: string;
}

interface AnnotatedDiffProps {
  diff: string;
  annotations: Annotation[];
}

export function AnnotatedDiff({ diff, annotations }: AnnotatedDiffProps) {
  const lines = diff.split("\n");
  const annotationMap = new Map(annotations.map((a) => [a.line, a.note]));

  return (
    <pre className="overflow-x-auto rounded-md border bg-muted p-3 font-mono text-sm text-foreground">
      {lines.map((line, index) => {
        const lineNumber = index + 1;
        const note = annotationMap.get(lineNumber);
        const added = line.startsWith("+");
        const removed = line.startsWith("-");
        return (
          <React.Fragment key={lineNumber}>
            <div
              className={cn(
                added && "text-primary",
                removed && "text-destructive",
              )}
            >
              {line}
            </div>
            {note && (
              <div role="note" className="pl-4 text-muted-foreground italic">
                {note}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </pre>
  );
}
