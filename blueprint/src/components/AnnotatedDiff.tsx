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
   * Shiki notation. Inferred when omitted, so this only needs setting to force
   * a mode.
   */
  unified?: boolean;
}

const MARKS = { "+": "add", "-": "remove" } as const;

// Every line carries a marker column and at least one is a change. Plain code
// never qualifies, so a snippet shown without marks stays untouched.
const looksUnified = (code: string) => {
  if (code.includes("[!code")) return false;
  const lines = code.split("\n").filter((line) => line !== "");
  return (
    lines.every((line) => /^[-+ ]/.test(line)) &&
    lines.some((line) => /^[-+]/.test(line))
  );
};

/**
 * Thin preset over fumadocs' DynamicCodeBlock: adds Shiki's official
 * transformerNotationDiff so lines marked `// [!code ++]` / `// [!code --]`
 * receive the `.diff.add` / `.diff.remove` classes that fumadocs' shiki.css
 * already styles (full-width tint + gutter symbol). Line notes are written as
 * normal code comments, so there is no separate annotations layer to maintain.
 *
 * A unified diff marks lines by a leading column instead, and is detected on
 * its own: a unified snippet read as notation renders with no marks at all. The marker is stripped
 * before highlighting so the body keeps its own language, and fumadocs'
 * `::before` restores the gutter symbol.
 */
export function AnnotatedDiff({ code, lang, unified }: AnnotatedDiffProps) {
  const marks = new Map<number, "add" | "remove">();
  let body = code;

  if (unified ?? looksUnified(code)) {
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
