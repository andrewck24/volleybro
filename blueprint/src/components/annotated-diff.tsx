import { Fragment } from "react";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";

import { parseAnnotatedDiff } from "@/lib/annotated-diff";

interface AnnotatedDiffProps {
  code: string;
  lang?: string;
  unified?: boolean;
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
