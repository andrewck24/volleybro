import { AnnotatedDiff } from "@/components/AnnotatedDiff";
import { ApproachComparison } from "@/components/ApproachComparison";
import { ChangeCard } from "@/components/ChangeCard";
import { ChangeOverview } from "@/components/ChangeOverview";
import { ConceptExplainer } from "@/components/ConceptExplainer";
import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";
import { PRWriteup } from "@/components/PRWriteup";
import { RiskTable } from "@/components/RiskTable";
import { Scenario } from "@/components/Scenario";
import { TaskProgress } from "@/components/TaskProgress";
import { Timeline } from "@/components/Timeline";

const flowchartNodes = [
  { id: "draft", label: "Draft", x: 60, y: 80 },
  { id: "review", label: "Review", x: 200, y: 80 },
  { id: "merge", label: "Merge", x: 340, y: 80 },
  { id: "ship", label: "Ship", x: 200, y: 170 },
];

const flowchartDetails: Record<string, { title: string; body: string }> = {
  draft: {
    title: "Draft",
    body: "An author opens a change proposal and drafts the design intent.",
  },
  review: {
    title: "Review",
    body: "Reviewers comment, request changes, and approve the proposal.",
  },
  merge: {
    title: "Merge",
    body: "Once approved, the change is merged into the main branch.",
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

      <h3>PRWriteup</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <PRWriteup
          number={48}
          title="Add design-system section"
          status="open"
        />
        <PRWriteup
          number={41}
          title="Rebuild RiskTable on shadcn"
          status="merged"
        />
        <PRWriteup
          number={39}
          title="Drop legacy tabs primitive"
          status="closed"
        />
      </div>

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

      <h3>ConceptExplainer</h3>
      <ConceptExplainer
        term="Side-out"
        definition="Winning a rally while the opposing team is serving, which earns your team the right to serve next."
        example={`if (rallyWinner === receivingTeam) {\n  serve = receivingTeam;\n  rotate(receivingTeam);\n}`}
      />

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
          },
          {
            date: "2026-06-28",
            label: "Dynamic splash screens",
            description:
              "Apple splash PNGs replaced by a token-driven generator.",
          },
          {
            date: "2026-07-12",
            label: "Design system section",
            description:
              "Blueprint gains a browsable component library showcase.",
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

      <h3>ApproachComparison</h3>
      <ApproachComparison
        approaches={[
          {
            name: "Mirror the features route",
            pros: ["Matches existing pattern", "No new content source"],
            cons: ["Shares the changes sidebar tree"],
          },
          {
            name: "Full Fumadocs content source",
            pros: ["Section-scoped sidebar", "MDX authoring"],
            cons: ["More wiring", "Diverges from features"],
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
      <InteractiveFlowchart nodes={flowchartNodes} details={flowchartDetails} />
    </div>
  );
}
