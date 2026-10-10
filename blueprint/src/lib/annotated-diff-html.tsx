import { highlight } from "fumadocs-core/highlight";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BundledLanguage } from "shiki";

import { parseAnnotatedDiff } from "./annotated-diff";

export async function renderAnnotatedDiffHtml(
  code: string,
  lang: BundledLanguage = "tsx",
  unified?: boolean,
) {
  const { code: source, lines } = parseAnnotatedDiff(code, unified);
  const markup = await highlight(source, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    transformers: [
      {
        name: "annotated-diff-lines",
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
      pre: (props) =>
        createElement(
          CodeBlock,
          { ...props, allowCopy: false, "data-language": lang },
          createElement(Pre, null, props.children),
        ),
    },
  });

  return renderToStaticMarkup(markup);
}
