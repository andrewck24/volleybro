// Compatibility layer for old-format Change pages; delete once all 22 are converted to the two-gate format.

// Old decision records carry a `status` field the current strict
// parseDecisionRecord rejects as an unknown key; this drops it before the
// value reaches that parser.
export function stripLegacyStatus(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const { status: _status, ...rest } = value as Record<string, unknown>;
  return rest;
}
