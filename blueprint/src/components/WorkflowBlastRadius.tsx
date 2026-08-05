import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";

const nodes = [
  { id: "idea", label: "Initial idea", x: 180, y: 60, w: 170, h: 50 },
  {
    id: "intake",
    label: "Operational intake",
    x: 180,
    y: 150,
    w: 190,
    h: 50,
  },
  {
    id: "focused",
    label: "Focused change",
    x: 70,
    y: 250,
    w: 150,
    h: 50,
  },
  {
    id: "large",
    label: "Large or foggy",
    x: 290,
    y: 250,
    w: 150,
    h: 50,
  },
  {
    id: "grill",
    label: "Grill-with-docs",
    x: 70,
    y: 350,
    w: 160,
    h: 50,
  },
  {
    id: "wayfinder",
    label: "Wayfinder map",
    x: 290,
    y: 350,
    w: 160,
    h: 50,
  },
  {
    id: "boundaries",
    label: "Change boundaries",
    x: 180,
    y: 450,
    w: 170,
    h: 50,
  },
  {
    id: "overview-design",
    label: "Overview + Design",
    x: 180,
    y: 550,
    w: 190,
    h: 50,
  },
  {
    id: "slices",
    label: "Implementation slices",
    x: 180,
    y: 650,
    w: 200,
    h: 50,
  },
  {
    id: "manual",
    label: "Manual Apply",
    x: 70,
    y: 760,
    w: 155,
    h: 50,
  },
  {
    id: "symphony",
    label: "Symphony Apply",
    x: 290,
    y: 760,
    w: 165,
    h: 50,
  },
  {
    id: "evidence",
    label: "Code + tests + Review",
    x: 180,
    y: 860,
    w: 200,
    h: 50,
  },
  {
    id: "acceptance",
    label: "Developer acceptance",
    x: 180,
    y: 960,
    w: 180,
    h: 50,
  },
  {
    id: "archive",
    label: "Branch-local Archive",
    x: 180,
    y: 1060,
    w: 190,
    h: 50,
  },
  {
    id: "merge",
    label: "PR → merge",
    x: 180,
    y: 1160,
    w: 160,
    h: 50,
  },
];

const edges = [
  { from: "idea", to: "intake" },
  { from: "intake", to: "focused", label: "focused" },
  { from: "intake", to: "large", label: "large / foggy" },
  { from: "focused", to: "grill" },
  { from: "large", to: "wayfinder" },
  { from: "grill", to: "boundaries" },
  { from: "wayfinder", to: "boundaries" },
  { from: "boundaries", to: "overview-design" },
  { from: "overview-design", to: "slices" },
  { from: "slices", to: "manual" },
  { from: "slices", to: "symphony" },
  { from: "manual", to: "evidence" },
  { from: "symphony", to: "evidence" },
  { from: "evidence", to: "acceptance" },
  { from: "acceptance", to: "archive" },
  { from: "archive", to: "merge" },
];

const details = {
  idea: {
    title: "Initial idea",
    body: "A developer starts with a problem, opportunity, or change signal.",
  },
  intake: {
    title: "Operational intake",
    body: "The initial idea is shaped into the operational work representation used by the repository workflow.",
  },
  focused: {
    title: "Focused change",
    body: "A bounded change can move directly into grill-with-docs for clarification.",
  },
  large: {
    title: "Large or foggy",
    body: "A broad or uncertain idea first uses Wayfinder to identify coherent change boundaries.",
  },
  grill: {
    title: "Grill-with-docs",
    body: "Discussion clarifies the problem, vocabulary, constraints, and intended outcome.",
  },
  wayfinder: {
    title: "Wayfinder map",
    body: "The change is split into meaningful boundaries before the durable design is drafted.",
  },
  boundaries: {
    title: "Change boundaries",
    body: "The agreed scope becomes one or more repository Changes with explicit ownership and edges.",
  },
  "overview-design": {
    title: "Overview + Design",
    body: "Blueprint presents the durable problem context, decision record, architecture, and testing strategy for developer review.",
  },
  slices: {
    title: "Implementation slices",
    body: "Approved work is split into independently verifiable JSON slices that can be applied manually or by Symphony.",
  },
  manual: {
    title: "Manual Apply",
    body: "A developer can execute the same repository-native Apply contract without a running Symphony scheduler.",
  },
  symphony: {
    title: "Symphony Apply",
    body: "Symphony may claim an eligible slice and invoke the same repository workflow in an isolated workspace.",
  },
  evidence: {
    title: "Code + tests + Review",
    body: "Implementation, verification, and review findings update the Change Review evidence before acceptance.",
  },
  acceptance: {
    title: "Developer acceptance",
    body: "The developer reviews the completed delivery evidence and confirms the result before Archive.",
  },
  archive: {
    title: "Branch-local Archive",
    body: "Verified durable knowledge is promoted into the appropriate Blueprint feature pages before the PR opens.",
  },
  merge: {
    title: "PR → merge",
    body: "The reviewed branch is opened as a pull request and merged after the repository delivery gates pass.",
  },
};

export function WorkflowBlastRadius() {
  return <InteractiveFlowchart nodes={nodes} edges={edges} details={details} />;
}
