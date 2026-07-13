import { AnnotatedDiff } from "@/components/AnnotatedDiff";
import { ChangeCard } from "@/components/ChangeCard";
import { ChangeOverview } from "@/components/ChangeOverview";
import { FileTour } from "@/components/FileTour";
import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";
import { RiskTable } from "@/components/RiskTable";
import { Scenario } from "@/components/Scenario";
import { TaskProgress } from "@/components/TaskProgress";
import { Timeline } from "@/components/Timeline";
import { TLDR } from "@/components/TLDR";

const flowchartNodes = [
  { id: "propose", label: "Propose", x: 90, y: 60 },
  { id: "review", label: "Review", x: 250, y: 190 },
  {
    id: "gate",
    label: "Approved?",
    x: 90,
    y: 320,
    shape: "diamond" as const,
    w: 130,
    h: 64,
  },
  {
    id: "merge",
    label: "Merge",
    x: 90,
    y: 450,
    sublabel: "squash → dev",
  },
  { id: "ship", label: "Ship", x: 90, y: 580 },
];

const flowchartEdges = [
  { from: "propose", to: "review", label: "open PR" },
  { from: "review", to: "gate" },
  { from: "gate", to: "merge", label: "yes" },
  { from: "merge", to: "ship", label: "release" },
  { from: "gate", to: "propose", label: "changes", dashed: true },
];

const flowchartDetails: Record<string, { title: string; body: string }> = {
  propose: {
    title: "Propose",
    body: "An author opens a change proposal and drafts the design intent.",
  },
  review: {
    title: "Review",
    body: "Reviewers comment on the proposal and request changes as needed.",
  },
  gate: {
    title: "Approved?",
    body: "The decision point: reviewers either approve or send it back for changes.",
  },
  merge: {
    title: "Merge",
    body: "Once approved, the change is squashed and merged into the dev branch.",
  },
  ship: {
    title: "Ship",
    body: "The merged change is bundled into the next release and shipped.",
  },
};

export default function ComponentLibraryShowcase() {
  return (
    <div>
      <h1>Component Library</h1>
      <p>
        Every kept blueprint component rendered with representative sample
        props. Use this page as a living-docs and visual-verification surface
        across light and dark themes.
      </p>

      <h2>Status &amp; progress</h2>

      <h3>TaskProgress</h3>
      <TaskProgress done={7} total={12} />

      <h3>TLDR</h3>
      <TLDR>
        This change swaps the grayscale chart palette for the canonical colorful
        one, sources the warning and note accents from it, and replaces two thin
        components with the TLDR and FileTour patterns.
      </TLDR>

      <h3>FileTour</h3>
      <p>
        One collapsible walkthrough that serves two modes at once. Badged
        entries (change + added/removed + snippet) narrate a diff file by file;
        entries that omit those fields become a concept walkthrough where header
        = term, summary = definition, and code = example.
      </p>
      <FileTour
        files={[
          {
            path: "src/components/FileTour.tsx",
            change: "added",
            added: 96,
            summary:
              "New collapsible walkthrough. Each row shows the file path and a diff stat when collapsed, and reveals the why plus an optional snippet when expanded — composed from the accordion primitive so it stays keyboard-accessible.",
            lang: "tsx",
            code: `export function FileTour({ files }: FileTourProps) {
  return (
    <Card className="gap-0 py-0">
      <Accordion type="multiple">
        {files.map((file, index) => (
          <AccordionItem key={file.path} value={file.path}>
            <AccordionTrigger>
              <span className="font-mono text-sm">{file.path}</span>
            </AccordionTrigger>
            <AccordionContent>
              <p>{file.summary}</p>
              {file.code && (
                <DynamicCodeBlock lang={file.lang ?? "tsx"} code={file.code} />
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}`,
          },
          {
            path: "src/app/globals.css",
            change: "modified",
            added: 14,
            removed: 62,
            summary:
              "Reordered tokens to canonical shadcn order and re-sourced the warning and note accents from the chart palette so both themes stay in sync.",
          },
          {
            path: "src/components/PRWriteup.tsx",
            change: "removed",
            removed: 41,
            summary:
              "Thin stub superseded by the TLDR and FileTour patterns; nothing imported it after the migration.",
          },
          {
            path: "Side-out",
            summary:
              "Concept mode — no change badge or diff stat. Winning a rally while the opposing team is serving, which earns your team the right to serve next.",
            code: `if (rallyWinner === receivingTeam) {\n  serve = receivingTeam;\n  rotate(receivingTeam);\n}`,
            lang: "ts",
          },
          {
            path: "Rally",
            summary:
              "Concept mode — a single sequence of play that starts with a serve and ends when the ball is dead, the unit a point is scored on.",
            code: `type Rally = {\n  serve: TeamId;\n  touches: Touch[];\n  winner: TeamId;\n};`,
            lang: "ts",
          },
        ]}
      />

      <section>
        <h3>PR-writeup section mapping</h3>
        <p>
          Where each section of the &ldquo;PR writeup&rdquo; reference belongs
          in the blueprint page flow:
        </p>
        <ul>
          <li>
            <strong>TL;DR</strong> → page/overview top (the TLDR component).
          </li>
          <li>
            <strong>Why</strong> → proposal/design (prose).
          </li>
          <li>
            <strong>Before/After</strong> → a table or AnnotatedDiff.
          </li>
          <li>
            <strong>File-by-file</strong> → design (the FileTour component).
          </li>
          <li>
            <strong>Where to focus review</strong> → review (prose).
          </li>
          <li>
            <strong>Test plan</strong> → tasks/review (prose).
          </li>
          <li>
            <strong>Rollout</strong> → reuse the Timeline component.
          </li>
        </ul>
      </section>

      <h3>ChangeCard</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <ChangeCard
          name="dialog-elevation-system"
          status="in-progress"
          summary="Redefine background color tokens into a three-layer elevation model and unify Dialog layout on top of that foundation."
        />
        <ChangeCard
          name="apple-splash-dynamic"
          date="2026-06-28"
          status="archived"
          summary="A parametric generator replaces nine hand-exported Apple splash PNGs, making splash screens track design tokens automatically."
        />
      </div>

      <h2>Prose &amp; explainers</h2>

      <h3>Scenario</h3>
      <Scenario
        given="A set is tied 24-24 and the home team is serving"
        when="The home team wins two consecutive rallies"
        then="The set is awarded to the home team at 26-24"
      />

      <h3>Timeline</h3>
      <Timeline
        events={[
          {
            date: "2026-06-16",
            label: "Clean architecture landed",
            description:
              "Team routes migrated to the domain/wire/client layering.",
            status: "done",
            tags: ["clean-architecture"],
          },
          {
            date: "2026-06-28",
            label: "Dynamic splash screens",
            description:
              "Apple splash PNGs replaced by a token-driven generator.",
            status: "done",
            tags: ["splash", "tokens"],
          },
          {
            date: "2026-07-12",
            label: "Design system section",
            description:
              "Blueprint gains a browsable component library showcase.",
            status: "pending",
            tags: ["design-system", "showcase"],
          },
        ]}
      />

      <h2>Tables &amp; comparison</h2>

      <h3>RiskTable</h3>
      <RiskTable
        risks={[
          {
            name: "Token drift between light and dark",
            severity: "critical",
            mitigation: "Single semantic token source consumed by both themes.",
          },
          {
            name: "Sidebar tree not scoped per section",
            severity: "warning",
            mitigation:
              "Track follow-up to give each section its own page tree.",
          },
          {
            name: "Static module map needs manual updates",
            severity: "info",
            mitigation: "Expand to dynamic discovery when pages grow.",
          },
          {
            name: "Components render in both themes",
            severity: "ok",
            mitigation: "Verified via this showcase page.",
          },
        ]}
      />

      <h3>AnnotatedDiff</h3>
      <AnnotatedDiff
        diff={`  sidebar={{
    tabs: [
      { title: "Changes", url: "/changes" },
      { title: "Features", url: "/features" },
+     { title: "Design System", url: "/design-system" },
    ],
  }}`}
        annotations={[
          {
            line: 5,
            note: "New peer tab registered alongside Changes and Features.",
          },
        ]}
      />

      <h2>Change index</h2>

      <h3>ChangeOverview</h3>
      <ChangeOverview
        date="2026-07-12"
        status="in-progress"
        summary="Add a design-system section and a component-library showcase page to the blueprint site."
        artifacts={[
          { title: "Proposal", href: "#proposal" },
          { title: "Design", href: "#design" },
          { title: "Tasks", href: "#tasks" },
        ]}
      />

      <h2>Flowchart</h2>

      <h3>InteractiveFlowchart</h3>
      <InteractiveFlowchart
        nodes={flowchartNodes}
        edges={flowchartEdges}
        details={flowchartDetails}
      />
    </div>
  );
}
