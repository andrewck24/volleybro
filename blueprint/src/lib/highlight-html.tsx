import { highlight } from "fumadocs-core/highlight";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { renderToStaticMarkup } from "react-dom/server";
import { bundledLanguages, type BundledLanguage } from "shiki";

import { parseAnnotatedDiff, type AnnotatedLine } from "./annotated-diff";

const highlightLanguage = (lang: string | undefined) =>
  lang && lang in bundledLanguages ? (lang as BundledLanguage) : "text";

export async function renderHighlightedLinesHtml(
  lines: AnnotatedLine[],
  lang?: string,
  title?: string,
) {
  const language = highlightLanguage(lang);
  const markup = await highlight(lines.map(({ text }) => text).join("\n"), {
    lang: language,
    themes: { light: "github-light", dark: "github-dark" },
    // Emit only --shiki-light/--shiki-dark variables so the theme CSS picks the colors;
    // an inline light default would pin dark mode to a white block.
    defaultColor: false,
    transformers: [
      {
        name: "diff-lines",
        line(node, number) {
          const mark = lines[number - 1]?.mark;
          if (!mark) return;

          this.addClassToHast(node, `diff ${mark}`);
          node.children.unshift({
            type: "element",
            tagName: "span",
            properties: { className: ["sr-only"] },
            children: [
              {
                type: "text",
                value: mark === "add" ? "Added line: " : "Removed line: ",
              },
            ],
          });
        },
      },
    ],
    components: {
      pre: (props) => (
        <CodeBlock
          {...props}
          title={title}
          allowCopy={false}
          data-language={language}
        >
          <Pre>{props.children}</Pre>
        </CodeBlock>
      ),
    },
  });

  return renderToStaticMarkup(markup);
}

export async function renderCodeHtml(
  code: string,
  lang?: string,
  title?: string,
) {
  return renderHighlightedLinesHtml(
    code.split("\n").map((text) => ({ text })),
    lang,
    title,
  );
}

export async function renderAnnotatedDiffHtml(
  code: string,
  lang: BundledLanguage = "tsx",
  unified?: boolean,
) {
  return renderHighlightedLinesHtml(
    parseAnnotatedDiff(code, unified).lines,
    lang,
  );
}
