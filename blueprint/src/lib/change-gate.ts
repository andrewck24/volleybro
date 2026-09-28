import type { ChangeFacts } from "@/lib/change-meta";

export const GATE_LABEL = { G1: "G1 Proposal", G2: "G2 Review" } as const;

// ADR-0096: a Migration's gate belongs to its current shard.
export function gateLabel(facts: ChangeFacts) {
  const gate = GATE_LABEL[facts.gate ?? "G1"];
  const shards = facts.shards;
  if (!shards?.current) return gate;
  return `Shard ${shards.current}/${shards.count} · ${gate}`;
}

export function mergedLabel(facts: ChangeFacts) {
  const shards = facts.shards;
  return shards ? `${shards.merged}/${shards.count} merged` : undefined;
}
