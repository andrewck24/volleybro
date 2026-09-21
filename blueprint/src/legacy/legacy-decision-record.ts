// Compatibility layer for records published inside Change pages on the store
// branch; delete once no such page needs it.

// Version 1 records carry a `status` field that the current strict
// parseDecisionRecord rejects as an unknown key. Placement said everything
// else a status could say, so this drops it before the value reaches that
// parser, which reads the rest of version 1 on its own.
export function upconvertLegacyDecisionRecord(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const { status: _status, ...rest } = value as Record<string, unknown>;
  return rest;
}
