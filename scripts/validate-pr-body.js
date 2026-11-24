import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { fromMarkdown } from "mdast-util-from-markdown";

export function validatePrBody({ body, headRef, authorLogin }) {
  if (!body?.trim()) return "Enter a PR description or release notes.";
  if (authorLogin === "dependabot[bot]") return;

  const lastSection = fromMarkdown(body).children.findLast(
    (node) => node.type === "heading" && node.depth <= 2,
  );
  const lastHeading = lastSection
    ? body.slice(
        lastSection.position.start.offset,
        lastSection.position.end.offset,
      )
    : "";
  if (!/^##[ \t]+摘要(?:[ \t]+#+)?[ \t]*$/.test(lastHeading)) {
    return "End the PR description with a ## 摘要 section.";
  }
  if (headRef.startsWith("fast/") && !/\bFast path\b/.test(body)) {
    return 'Mention "Fast path" in the PR description.';
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { pull_request: pr } = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
  );
  const error = validatePrBody({
    body: pr.body,
    headRef: pr.head.ref,
    authorLogin: pr.user.login,
  });
  if (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
