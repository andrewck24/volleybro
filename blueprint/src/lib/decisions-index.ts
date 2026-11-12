import {
  parseDecisionRecord,
  type DecisionRecord,
} from "@/lib/decision-record";
import {
  allDecisionsFrom,
  decisionsByIdFrom,
  decisionsForFrom,
} from "@/lib/decision-lookup";

const decisions = Object.values(
  import.meta.glob("../../content/decisions/*.json", {
    eager: true,
    import: "default",
  }),
).map(parseDecisionRecord);

export function allDecisions(): DecisionRecord[] {
  return allDecisionsFrom(decisions);
}

export function decisionsFor(capability: string): DecisionRecord[] {
  return decisionsForFrom(decisions, capability);
}

export function decisionsById(ids: string[]): DecisionRecord[] {
  return decisionsByIdFrom(decisions, ids);
}
