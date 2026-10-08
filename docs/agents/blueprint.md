# Blueprint adapter

Blueprint is the repository-owned human comprehension and review surface. It does not know which issue tracker or orchestration runtime is configured.

## Change review surfaces

Every Change is one page with a Proposal tab and, from G2, a Review tab; a Sharded Change has a Review tab per shard. Each tab is a file of its own (ADR-0094): `index.mdx` holds only the frontmatter, `proposal.mdx` the Proposal and the exported scenarios, and `review.mdx`, or `review-s<N>.mdx` for shard N, the Review; `design.tsx` is an optional interactive mockup, not a required Proposal artifact. The page is written under `blueprint/content/changes/<slug>/`, gitignored on the Change branch. At each gate the agent runs `pnpm blueprint:gate <slug>` (ADR-0084), which publishes the page to the orphan `blueprint-changes` branch — the durable store of every Change page, old and new, that never merges into other branches — and runs the gate check. `pnpm --filter blueprint dev` and `build` first run `pnpm blueprint:changes:pull`, copying every published Change into `blueprint/content/changes/` without overwriting local drafts, so every deploy carries all published Changes plus Features and the Design System from the deployed branch; deploys fail loudly if the store cannot be fetched. A ruleset forbids deleting the store branch or pushing anything but a fast-forward to it, so it shrinks through ordinary commits or another ref, never a history rewrite (ADR-0081), and the pull warns once the store's history passes 50 MB (ADR-0082). Decision records live at `blueprint/content/decisions/<nnnn>-<slug>.json`, follow the one definition in `blueprint/src/lib/decision-record.ts` (ADR-0080), and belong to the repository rather than to any Change. A Proposal tab is published at a gate before its own records merge, so it names the records it wants by id and `DecisionCards` resolves whichever ones this checkout has, skipping the rest; new Changes must not maintain a parallel hard-coded `DECISIONS` array as a second editable source.

Because those pages come from the store branch, any one of them can reference something this checkout lacks, and a Change page that cannot render must not take the build with it. The Change route calls a page body as a function and renders the thrown message in its place. A design mockup holds hooks, so it cannot be called that way; it renders in the browser behind an error boundary instead. Neither a boundary nor `error.tsx` helps during prerender — under `output: "export"` a throw there ends the build before React can catch it.

Gate links default to the main Blueprint URL; use `pnpm blueprint:gate <slug> --preview` for unmerged components, decisions or Features. The gate verifies the hosted page and its complete content hash in `/blueprint-build.json`, not just the header or hook response. A failed or pending hosted check is not a completed publication handoff. `WORKFLOW.md` owns deployment coordination, cutover and lifecycle derivation; the gate does not update accepted snapshots after merge.

The dependency also runs the other way: published pages use `blueprint/src` — components, and types such as `DecisionRecord` — so its exports are an API to every published page, whatever this branch's own pages use. Before changing one, run `pnpm blueprint:changes:pull`, search `blueprint/content/changes/` for it, and prove the change with `pnpm --filter blueprint build` and focused component or parser regressions for the affected contract. The build type-checks each `design.tsx`; page render failures carry `data-blueprint-render-error` and must fail the hosted gate. Do not open every consuming page in a browser.

## Canonical current knowledge

Blueprint Features describe the current and planned capability tree:

- place current behavior and capability-specific constraints on the narrowest sub-capability;
- place a constraint or decision on a parent capability only when it governs multiple children;
- let each page render the decision records whose `capabilities` name it, rather than listing them by hand;
- place reusable UI/UX rules in the Design System rather than duplicating them across Features;
- represent product direction as roadmap state without copying operational scheduling from the configured tracker.

A Feature page holds no decision file of its own: a record names its capabilities and every page they name renders it, so one decision governing several capabilities stays one file. Archive first assesses whether durable capability knowledge changed, updates only the affected Features when needed, records the assessment in Review and leaves decision records where they are.

Code and tests remain the behavioral authority. Feature prose must agree with their observable behavior, while Changesets remain the authority for semantic version and changelog evidence.

## Writing a Change page

Read this section before writing or editing any Blueprint page. The agent writing a page reads it at that moment; the standards reviewer reaches it through `CODING_STANDARDS.md`.

Blueprint pages exist to be read by a person, so structure a reader can scan is part of the artifact rather than decoration. Prose alone is insufficient wherever the information is spatial, comparative, or ranked by severity: no paragraph shows at a glance which files changed, which finding blocks acceptance, or which line a fix landed on. Render such information with the components the repository already has, rather than describing it:

| Information                                       | Component              |
| ------------------------------------------------- | ---------------------- |
| The page's claim, before any detail               | `TLDR`                 |
| A behavior stated as given / when / then          | `Scenario`             |
| The acceptance scenarios, defined once as data    | `Scenarios`            |
| Before and after of a specific edit               | `AnnotatedDiff`        |
| Risks or code review findings, ranked by severity | `RiskTable`            |
| A process whose steps a reader may want to open   | `InteractiveFlowchart` |
| Structured decision records                       | `DecisionCards`        |
| A result per scenario                             | `ScenarioResults`      |
| What was tested, how, by whom, with what result   | `TestPlan`             |

The page's shape, one file per tab; the route renders each file as its tab, so no file imports another to be shown:

```text
index.mdx
---
title: <name>
description: <one line>
capabilities: ["<capability id>"]
shards: 2                      a Sharded Change only
---

proposal.mdx
export const scenarios = [{ id: "S1", shard: 1, given: "…", when: "…", then: "…" }];

<TLDR>…</TLDR>
…

review.mdx, or review-s1.mdx for shard 1
<ActionItems>

…

</ActionItems>

…
```

A scenario carries `shard` only on a Sharded Change. A Review file that shows the scenarios imports them with `import { scenarios } from "./proposal.mdx";`. Every section puts its opening and closing tags on lines of their own: written on one line, MDX treats it as inline text and it renders inside a paragraph.

The complete Proposal is published and its hosted receipt and page identity verified before the developer accepts it at G1; discussion convergence alone is not that acceptance. Routine agent browser review is not part of either gate. Impeccable critique and distill review text only. A developer may inspect the dev preview; the agent opens a browser only when the developer says a diagram or screen is hard to understand. Its converged summary contains: `TLDR` stating the problem and the solution; for a behavior Change, a before/after table of two to four rows showing what changes for the reader; `DecisionCards` for the decision records; the scope; `<Scenarios items={scenarios} />`; and the risks through `RiskTable`. It adds an `InteractiveFlowchart` when the Change alters a process, `<DesignMockup />` (rendering `design.tsx`) when it answers a design question, and a `## References` section when research backs a decision, and needs no other narrative. The page shell renders the header — gate, capability badges, figures — so the page does not write it.

Create visual evidence only when it answers an active design question. Use a dev preview and a small number of before-and-after captures for copy, color, spacing, or rearrangements of existing components. Use an isolated prototype on demand for new interactions, state changes, or animation. After a decision, keep only the necessary captures or video, key states, and the reason for the choice. Keep an interactive mockup only when repeated comparison is still needed, preferring shared components with a small data set. Do not create or retain `design.tsx` just to pass a gate. When a G1 or G2 snapshot already contains `design.tsx`, the trusted Preview workflow runs one headless Chromium proof for that Change route and fails closed on missing identity, mount, or error evidence.

Every acceptance scenario states behavior the agent can verify itself before G2, since the G2 gate needs a pass or fail for each one; a check only the developer can make belongs in the Review tab's `TestPlan`, not among the scenarios.

The Review tab holds these sections, all required but `AfterRelease`, and the page renders them in this order whatever order they are written in (ADR-0073): `ActionItems` (what the developer must decide or do, or 無; it lists every decision record whose `decision` text changed after G1), `ReviewFocus` (the two or three places in the pull request most worth the developer's own reading, with why), `Deviations` (from the Proposal, or 無; a short `AnnotatedDiff` only when a deviation is clearest as code; an approach switch under ADR-0077 names the root cause and why the findings it grouped share it), `ScenarioResults` (a result for every scenario id — on a Sharded Change, every scenario of that shard — with one line of evidence; `pending` is not a result), `TestPlan` (each item naming its executor; the agent runs every check it can, a browser or device check included, and names the developer only for one it cannot run, which `ActionItems` then points at), `AfterRelease` when something must happen after release, and `ReviewDetails`, collapsed, holding verification detail, code review findings and residual risks. It carries no code diff by default: the pull request shows the full diff.

A page converted from the earlier two-page format holds its accepted text unchanged: decisions render as `DecisionCards`, scenarios come from the `scenarios` export, the acceptance-result table becomes `ScenarioResults` (a result recorded as less than a pass becomes `unverified`, with its wording kept in the evidence), code review findings and residual risks sit in `ReviewDetails`, and the Review page's own one-line description opens the Review tab. A page converted from the four-page or Spectra format (ADR-0079) opens its Proposal tab with a one-line note that it was converted mechanically, keeps its Overview, Proposal and Design text there and its Review page, collapsed in `ReviewDetails`, in the Review tab, and has no scenarios; a draft that never passed G1 has no Review tab. Its `facts.json` carries `converted: true`. Converted pages predate the required sections, so they are never run through a gate.

Rules that bind every page:

- A component earns its place by carrying structure prose cannot. The narrative that explains _why_ still belongs beside it.
- Components render data and never become a second source for it. A page must not restate what the page shell already renders from the slice sub-issues or the decision records.
- Diagrams are part of the specification, not illustrations of it. When delivery diverges from what a diagram shows, the diagram is corrected in the same round as the text.
- Use an ordered list wherever items are referred to by number elsewhere on the page.
- The frontmatter `title` is the Change's name, for people; it may differ from the slug, and it is never empty or only a tab name.
- Prose never hand-copies a count (ADR-0074). A figure `facts.json` holds is left to the header; any other number is replaced by a qualitative statement, or stands beside the command that produced it so a reviewer can rerun it.
- What a gate accepted is frozen file by file (ADR-0095): `proposal.mdx` and the frontmatter of `index.mdx` change only by passing G1 again, and an earlier shard's `review-s<N>.mdx` only by passing that shard's G2 again, even for layout.
- Component string props render a backtick-quoted span as inline code and everything else as plain text: no bold, links, or other markdown. Flowchart node and edge labels are drawn in SVG and stay plain text entirely.
- A Change page's prose is written in zh-tw, keeping technical terms and proper nouns in en; Feature pages and the Design System pages under `blueprint/content/design-system/` are written in en. What an agent reads stays in en: `Scenario` strings, decision records, and code. Commit and pull-request language is in `CONTRIBUTING.md`.
- Referencing other Changes and wrapping prose follow the Writing section of `CONTRIBUTING.md`.

## Writing a decision record

A record holds one decision, and governs either the product or the delivery process — the workflow, the Blueprint, tooling and documents — never both. Write one only when the decision is hard to reverse, would surprise a reader without its context, and came out of a real trade-off; an easily reversed or obvious choice needs no record.

The `decision` field states the decision itself in a few sentences; supporting detail belongs in `context` or `consequences`. A `decision` stays under 1000 characters; past that, split a record that bundles several decisions, or move detail out of a single decision's `decision` field. When neither applies, keep the record and put it to the developer at the gate with the reason.
