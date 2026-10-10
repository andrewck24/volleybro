import { Fragment } from "react";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";

import { parseAnnotatedDiff } from "@/lib/annotated-diff";

interface AnnotatedDiffProps {
  /**
   * Code using Shiki diff notation (`// [!code ++]` / `// [!code --]` on a line)
   * plus ordinary language comments for any per-line notes.
   */
  code: string;
  /** Code language metadata (default "tsx"). */
  lang?: string;
  /**
   * Read `code` as a unified diff (leading `+`/`-`/space column) instead of
   * Shiki notation. Inferred when omitted, so this only needs setting to force
   * a mode.
   */
  unified?: boolean;
  /** HTML produced by the build-time Shiki renderer for static Astro output. */
  highlightedHtml?: string;
}

export function AnnotatedDiff({
  code,
  lang = "tsx",
  unified,
  highlightedHtml,
}: AnnotatedDiffProps) {
  if (highlightedHtml) {
    return <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
  }

  const { lines } = parseAnnotatedDiff(code, unified);

  return (
    <CodeBlock allowCopy={false} data-language={lang}>
      <Pre>
        <code>
          {lines.map(({ text, mark }, index) => (
            <Fragment key={index}>
              {index > 0 ? "\n" : null}
              <span className={mark ? `line diff ${mark}` : "line"}>
                {mark && (
                  <span className="sr-only">
                    {mark === "add" ? "Added line: " : "Removed line: "}
                  </span>
                )}
                {text}
              </span>
            </Fragment>
          ))}
        </code>
      </Pre>
    </CodeBlock>
  );
}
