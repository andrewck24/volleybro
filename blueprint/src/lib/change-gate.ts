import type { ChangeFacts } from "@/lib/change-meta";

export const GATE_LABEL = { G1: "G1 Proposal", G2: "G2 Review" } as const;

// ADR-0096: a Migration's gate belongs to its current shard.
export function gateLabel(facts: ChangeFacts) {
  const shards = facts.shards;
  if (!shards?.current) return GATE_LABEL[facts.gate ?? "G1"];
  const shard = `Shard ${shards.current}/${shards.count}`;
  return facts.gate ? `${shard} · ${GATE_LABEL[facts.gate]}` : shard;
}

export function mergedLabel(facts: ChangeFacts) {
  const shards = facts.shards;
  return shards ? `${shards.merged}/${shards.count} merged` : undefined;
}
