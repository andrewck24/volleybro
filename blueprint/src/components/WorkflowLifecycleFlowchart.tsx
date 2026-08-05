import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";

const nodes = [
  {
    id: "intake",
    label: "Intake",
    x: 180,
    y: 60,
    sublabel: "operational state",
    w: 150,
    h: 52,
  },
  { id: "discuss", label: "Discuss", x: 180, y: 150, w: 150, h: 52 },
  {
    id: "propose",
    label: "Propose",
    x: 180,
    y: 240,
    sublabel: "Overview + Design",
    w: 180,
    h: 52,
  },
  {
    id: "prepare",
    label: "Prepare",
    x: 180,
    y: 330,
    sublabel: "Blueprint JSON",
    w: 170,
    h: 52,
  },
  { id: "apply", label: "Apply", x: 180, y: 420, w: 150, h: 52 },
  {
    id: "manual",
    label: "Manual",
    x: 65,
    y: 510,
    sublabel: "developer invokes",
    w: 180,
    h: 52,
  },
  {
    id: "symphony",
    label: "Symphony",
    x: 295,
    y: 510,
    sublabel: "scheduler invokes",
    w: 190,
    h: 52,
  },
  {
    id: "pre-pr",
    label: "Pre-PR review",
    x: 180,
    y: 600,
    sublabel: "code + tests + Review",
    w: 200,
    h: 52,
  },
  {
    id: "accepted",
    label: "Accepted?",
    x: 180,
    y: 700,
    shape: "diamond" as const,
    w: 160,
    h: 70,
  },
  {
    id: "archive",
    label: "Archive",
    x: 180,
    y: 810,
    sublabel: "promote + freeze",
    w: 180,
    h: 52,
  },
  { id: "pr", label: "PR", x: 180, y: 900, w: 150, h: 52 },
  {
    id: "merge",
    label: "Merge",
    x: 180,
    y: 990,
    sublabel: "tracker Done",
    w: 170,
    h: 52,
  },
];

const edges = [
  { from: "intake", to: "discuss" },
  { from: "discuss", to: "propose" },
  { from: "propose", to: "prepare" },
  { from: "prepare", to: "apply" },
  { from: "apply", to: "manual" },
  { from: "apply", to: "symphony" },
  { from: "manual", to: "pre-pr" },
  { from: "symphony", to: "pre-pr" },
  { from: "pre-pr", to: "accepted" },
  { from: "accepted", to: "archive", label: "yes" },
  { from: "accepted", to: "pre-pr", label: "fix", dashed: true },
  { from: "archive", to: "pr" },
  { from: "pr", to: "merge" },
];

const details = {
  intake: {
    title: "Intake",
    body: "The operational tracker holds intake, priority, dependencies, and active status while the Change remains in flight.",
  },
  discuss: {
    title: "Discuss",
    body: "The developer uses grill-with-docs or Wayfinder to clarify the problem and establish the Change boundary.",
  },
  propose: {
    title: "Propose",
    body: "Blueprint Overview and Design capture the durable rationale, decisions, architecture, and testing strategy for approval.",
  },
  prepare: {
    title: "Prepare",
    body: "Approved work becomes independently verifiable implementation-slice JSON before execution is armed.",
  },
  apply: {
    title: "Apply",
    body: "Both execution modes invoke the same repository workflow and keep slice status, code, tests, and Review evidence coherent.",
  },
  manual: {
    title: "Manual Apply",
    body: "A developer can run Apply directly when Symphony is stopped, unavailable, or intentionally not used.",
  },
  symphony: {
    title: "Symphony Apply",
    body: "When enabled, the scheduler claims an armed Change and invokes the same Apply contract in an isolated workspace.",
  },
  "pre-pr": {
    title: "Pre-PR review",
    body: "Independent review checks repository standards and the approved specification, then records fixes and reruns in Blueprint Review.",
  },
  accepted: {
    title: "Developer acceptance",
    body: "The developer decides whether the completed Review evidence is sufficient to begin branch-local Archive.",
  },
  archive: {
    title: "Archive",
    body: "Verified current behavior, constraints, and decisions are promoted to Features; the Change is frozen before the PR opens.",
  },
  pr: {
    title: "Pull request",
    body: "The archived branch is opened for delivery review. Optional human comments may still produce fix rounds.",
  },
  merge: {
    title: "Merge",
    body: "After repository gates pass, the PR merges and the operational tracker may move the work to Done.",
  },
};

export function WorkflowLifecycleFlowchart() {
  return <InteractiveFlowchart nodes={nodes} edges={edges} details={details} />;
}
