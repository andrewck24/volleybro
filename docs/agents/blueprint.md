# Blueprint adapter

Blueprint is the repository-owned human comprehension and review surface. It does not know which
issue tracker or orchestration runtime is configured.

## Change review surfaces

Every Change is one page, `index.mdx`, with a Proposal tab and, from G2, a Review tab (ADR-0072),
plus an optional design mockup `design.tsx`. The page is written under
`blueprint/content/changes/<slug>/`, gitignored on the Change branch. At each gate the agent
publishes it with `pnpm blueprint:changes:publish <slug>`, which
commits them to the orphan `blueprint-changes` branch and pushes it — the durable store of every
Change page, old and new, that never merges into other branches. `pnpm check:workflow --gate <slug>`
confirms the publish: it fails when a page was never published or was edited since. `pnpm --filter blueprint dev` and
`build` first run `pnpm blueprint:changes:pull`, copying every published Change into
`blueprint/content/changes/` without overwriting local drafts, so every deploy carries all published
Changes plus Features and the Design System from the deployed branch; deploys fail loudly if the
store cannot be fetched. Decision records live at `blueprint/content/decisions/<nnnn>-<slug>.json`,
follow `blueprint/schemas/decision-record.schema.json`, and belong to the repository rather than to
any Change. A Proposal tab is published at a gate before its own records merge, so it names the
records it wants by id and `DecisionCards` resolves whichever ones this checkout has, skipping
the rest; new Changes must not maintain a parallel hard-coded `DECISIONS` array as a second editable
source.

Because those pages come from the store branch, any one of them can reference something this
checkout lacks, and a Change page that cannot render must not take the build with it. The Change
route calls a page body as a function and renders the thrown message in its place. A design mockup
holds hooks, so it cannot be called that way; it renders in the browser behind an error boundary
instead. Neither a boundary nor `error.tsx` helps during prerender — under `output: "export"` a
throw there ends the build before React can catch it.

## Canonical current knowledge

Blueprint Features describe the current and planned capability tree:

- place current behavior and capability-specific constraints on the narrowest sub-capability;
- place a constraint or decision on a parent capability only when it governs multiple children;
- let each page render the decision records whose `capabilities` name it, rather than listing them
  by hand;
- place reusable UI/UX rules in the Design System rather than duplicating them across Features;
- represent product direction as roadmap state without copying operational scheduling from the
  configured tracker.

A Feature page holds no decision file of its own: a record names its capabilities and every page
they name renders it, so one decision governing several capabilities stays one file. Archive
promotes behavior and durable constraints to Features and leaves the records where they are.

Code and tests remain the behavioral authority. Feature prose must agree with their observable
behavior, while Changesets remain the authority for semantic version and changelog evidence.

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

The page's shape, with `scenarios` exported once at the top so both tabs read the same data:

```text
---
title: <name>
description: <one line>
capabilities: ["<capability id>"]
---

export const scenarios = [{ id: "S1", given: "…", when: "…", then: "…" }];

<ChangeTabs>
<Proposal>

…

</Proposal>
<Review>

<ActionItems>

…

</ActionItems>

…

</Review>
</ChangeTabs>
```

Every tab and section puts its opening and closing tags on lines of their own: written on one line, MDX treats it as inline text, it renders inside a paragraph, and the gate fails it.

The Proposal tab is the summary the developer confirmed at G1, taken verbatim: `TLDR` stating the problem and the solution; for a behavior Change, a before/after table of two to four rows showing what changes for the reader; `DecisionCards` for the decision records; the scope; `<Scenarios items={scenarios} />`; and the risks through `RiskTable`. It adds an `InteractiveFlowchart` when the Change alters a process, `<DesignMockup />` (rendering `design.tsx`) when it answers a design question, and a `## References` section when research backs a decision, and needs no other narrative. The page shell renders the header — gate, capability badges, figures — so the page does not write it.

The Review tab runs in this order (ADR-0073); the page renders its sections in this order whatever order they are written in, and the gate fails a Review missing any required one: `ActionItems` (what the developer must decide or do, or 無), `ReviewFocus` (the two or three places in the pull request most worth the developer's own reading, with why), `Deviations` (from the Proposal, or 無; a short `AnnotatedDiff` only when a deviation is clearest as code), `ScenarioResults` (a result for every scenario id, with one line of evidence; `pending` is not a result), `TestPlan` (each item naming its executor, agent or developer; `ActionItems` points at the developer-run ones), `AfterRelease` when something must happen after release, and `ReviewDetails`, collapsed, holding verification detail, code review findings and residual risks. It carries no code diff by default: the pull request shows the full diff.

Rules that bind every page:

- A component earns its place by carrying structure prose cannot. The narrative that explains _why_ still belongs beside it.
- Components render data and never become a second source for it. A page must not restate what the page shell already renders from the slice sub-issues or the decision records.
- Diagrams are part of the specification, not illustrations of it. When delivery diverges from what a diagram shows, the diagram is corrected in the same round as the text.
- Use an ordered list wherever items are referred to by number elsewhere on the page.
- The frontmatter `title` is the Change's name, for people; it may differ from the slug. `pnpm check:workflow --gate <slug>` fails an empty title or one that is only a tab name.
- Prose never hand-copies a count (ADR-0074). A figure `facts.json` holds is left to the header; any other number is replaced by a qualitative statement, or stands beside the command that produced it so a reviewer can rerun it.
- What G1 accepted is frozen (ADR-0075): the Proposal tab, the frontmatter and the exported scenarios change only by passing G1 again, even for layout.
- Component string props render a backtick-quoted span as inline code and everything else as plain text: no bold, links, or other markdown. Flowchart node and edge labels are drawn in SVG and stay plain text entirely.
- Prose is written in zh-tw, keeping technical terms and proper nouns in en. What an agent reads stays in en: `Scenario` strings, decision records, and code. Commit and pull-request language is in `CONTRIBUTING.md`.
- Referencing other Changes and wrapping prose follow the Writing section of `CONTRIBUTING.md`.

## Writing a decision record

A record holds one decision. Write one only when the decision is hard to reverse, would surprise a reader without its context, and came out of a real trade-off; an easily reversed or obvious choice needs no record.

The `decision` field states the decision itself in a few sentences; supporting detail belongs in `context` or `consequences`. At a gate, `pnpm check:workflow --gate <slug>` warns when a record added on the branch has a `decision` longer than 1000 characters. The warning is a prompt to act, not a failure: split a record that bundles several decisions, or move detail out of a single decision's `decision` field. When neither applies, keep the record and put it to the developer at the gate with the reason.
