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
}

/**
 * Thin preset over fumadocs' DynamicCodeBlock: adds Shiki's official
 * transformerNotationDiff so lines marked `// [!code ++]` / `// [!code --]`
 * receive the `.diff.add` / `.diff.remove` classes that fumadocs' shiki.css
 * already styles (full-width tint + gutter symbol). Line notes are written as
 * normal code comments, so there is no separate annotations layer to maintain.
 */
export function AnnotatedDiff({ code, lang }: AnnotatedDiffProps) {
  return (
    <DynamicCodeBlock
      lang={lang ?? "tsx"}
      code={code}
      options={{
        themes: { light: "github-light", dark: "github-dark" },
        transformers: [transformerNotationDiff()],
      }}
    />
  );
}
