import React from "react";

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
    <pre>
      {lines.map((line, index) => {
        const lineNumber = index + 1;
        const note = annotationMap.get(lineNumber);
        return (
          <React.Fragment key={lineNumber}>
            <div>{line}</div>
            {note && (
              <div role="note" style={{ paddingLeft: "1em", fontStyle: "italic" }}>
                {note}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </pre>
  );
}
