"use client";

import { transformerNotationDiff } from "@shikijs/transformers";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

interface AnnotatedDiffProps {
  /**
   * Code using Shiki diff notation (`// [!code ++]` / `// [!code --]` on a line)
   * plus ordinary language comments for any per-line notes.
   */
  code: string;
  /** Shiki language for `code` (default "tsx"). */
  lang?: string;
  /**
   * Read `code` as a unified diff (leading `+`/`-`/space column) instead of
   * Shiki notation. Use for JSX, where `//` inside a tag or child is text, not
   * a comment.
   */
  unified?: boolean;
}

const MARKS = { "+": "add", "-": "remove" } as const;

/**
 * Thin preset over fumadocs' DynamicCodeBlock: adds Shiki's official
 * transformerNotationDiff so lines marked `// [!code ++]` / `// [!code --]`
 * receive the `.diff.add` / `.diff.remove` classes that fumadocs' shiki.css
 * already styles (full-width tint + gutter symbol). Line notes are written as
 * normal code comments, so there is no separate annotations layer to maintain.
 *
 * `unified` marks lines by a leading column instead. The marker is stripped
 * before highlighting so the body keeps its own language, and fumadocs'
 * `::before` restores the gutter symbol.
 */
export function AnnotatedDiff({ code, lang, unified }: AnnotatedDiffProps) {
  const marks = new Map<number, "add" | "remove">();
  let body = code;

  if (unified) {
    body = code
      .split("\n")
      .map((line, index) => {
        const mark = MARKS[line[0] as keyof typeof MARKS];
        if (!mark) return line;
        marks.set(index + 1, mark);
        return ` ${line.slice(1)}`;
      })
      .join("\n");
  }

  return (
    <DynamicCodeBlock
      lang={lang ?? "tsx"}
      code={body}
      options={{
        themes: { light: "github-light", dark: "github-dark" },
        transformers: [
          transformerNotationDiff(),
          {
            name: "unified-diff",
            line(node, line) {
              const mark = marks.get(line);
              if (mark) this.addClassToHast(node, `diff ${mark}`);
            },
          },
        ],
      }}
    />
  );
}
