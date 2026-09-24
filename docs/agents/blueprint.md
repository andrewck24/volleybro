# Blueprint adapter

Blueprint is the repository-owned human comprehension and review surface. It does not know which
issue tracker or orchestration runtime is configured.

## Change review surfaces

Every Change renders a Proposal page (with an optional design-mockup `proposal.tsx`) and, later, a
Review page. Both are written under `blueprint/content/changes/<slug>/`, gitignored on the Change
branch. At each gate the agent publishes them with `pnpm blueprint:changes:publish <slug>`, which
commits them to the orphan `blueprint-changes` branch and pushes it — the durable store of every
Change page, old and new, that never merges into other branches. `pnpm check:workflow --gate <slug>`
confirms the publish: it fails when a page was never published or was edited since. `pnpm --filter blueprint dev` and
`build` first run `pnpm blueprint:changes:pull`, copying every published Change into
`blueprint/content/changes/` without overwriting local drafts, so every deploy carries all published
Changes plus Features and the Design System from the deployed branch; deploys fail loudly if the
store cannot be fetched. Decision records live at `blueprint/content/decisions/<nnnn>-<slug>.json`,
follow `blueprint/schemas/decision-record.schema.json`, and belong to the repository rather than to
any Change. A Proposal page is published at a gate before its own records merge, so it names the
records it wants by id and `DecisionTimeline` resolves whichever ones this checkout has, skipping
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

| Information                                          | Component              |
| ---------------------------------------------------- | ---------------------- |
| The page's claim, before any detail                  | `TLDR`                 |
| A behavior stated as given / when / then             | `Scenario`             |
| What changed per file, or a term-by-term walkthrough | `FileTour`             |
| Before and after of a specific edit                  | `AnnotatedDiff`        |
| Risks or code review findings, ranked by severity    | `RiskTable`            |
| A process whose steps a reader may want to open      | `InteractiveFlowchart` |
| Structured decision records                          | `DecisionTimeline`     |

Minimum per page. A Proposal is the summary the developer confirmed at G1, taken verbatim: it opens with `TLDR`, then the decisions, the scope, the acceptance criteria as `Scenario` blocks, and the risks through `RiskTable`; it adds an `InteractiveFlowchart` when the Change alters a process and a mockup (`proposal.tsx`) when the Change answers a design question, and needs no other diagram or narrative. A Review opens with `TLDR`, shows acceptance results and verification as tables, findings through `RiskTable`, and boundary-relevant fixes as `AnnotatedDiff`.

Rules that bind every page:

- A component earns its place by carrying structure prose cannot. The narrative that explains _why_ still belongs beside it.
- Components render data and never become a second source for it. A page must not restate what the page shell already renders from the slice sub-issues or the decision records.
- Diagrams are part of the specification, not illustrations of it. When delivery diverges from what a diagram shows, the diagram is corrected in the same round as the text.
- Use an ordered list wherever items are referred to by number elsewhere on the page.
- The frontmatter `title` is `<name> — Proposal` or `<name> — Review`, with an em dash, so the sidebar tells Changes apart. The name is for people and may differ from the slug. `pnpm check:workflow --gate <slug>` checks the shape.
- Component string props render a backtick-quoted span as inline code and everything else as plain text: no bold, links, or other markdown. Flowchart node and edge labels are drawn in SVG and stay plain text entirely.
- Prose is written in zh-tw, keeping technical terms and proper nouns in en. What an agent reads stays in en: `Scenario` strings, decision records, and code. Commit and pull-request language is in `CONTRIBUTING.md`.
- Referencing other Changes and wrapping prose follow the Writing section of `CONTRIBUTING.md`.

## Writing a decision record

A record holds one decision. Write one only when the decision is hard to reverse, would surprise a reader without its context, and came out of a real trade-off; an easily reversed or obvious choice needs no record.

The `decision` field states the decision itself in a few sentences; supporting detail belongs in `context` or `consequences`. At a gate, `pnpm check:workflow --gate <slug>` warns when a record added on the branch has a `decision` longer than 1000 characters. The warning is a prompt to act, not a failure: split a record that bundles several decisions, or move detail out of a single decision's `decision` field. When neither applies, keep the record and put it to the developer at the gate with the reason.
