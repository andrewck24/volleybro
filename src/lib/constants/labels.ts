/**
 * T125: Label Constants
 *
 * Centralized definitions for all label mappings used throughout the application
 * This eliminates duplication of label objects across components
 */

// Role labels
export const ROLE_LABELS: Record<string, string> = {
  MEMBER: "成員",
  ADMIN: "管理員",
  OWNER: "擁有者",
};

// Position labels for volleyball players
export const POSITION_LABELS: Record<string, string> = {
  OH: "Outside Hitter",
  MB: "Middle Blocker",
  OP: "Opposite",
  S: "Setter",
  L: "Libero",
  "": "Unspecified",
};

/**
 * Get label for a value from a mapping
 * Returns the value itself as fallback if not found
 */
export function getLabel(
  mapping: Record<string, string>,
  value: string,
): string {
  return mapping[value] || value;
}

/**
 * Get role label with fallback
 */
export function getRoleLabel(role: string): string {
  return getLabel(ROLE_LABELS, role);
}

/**
 * Get position label with fallback
 */
export function getPositionLabel(position: string): string {
  return getLabel(POSITION_LABELS, position);
}
