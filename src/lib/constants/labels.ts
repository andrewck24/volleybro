/**
 * T125: Label Constants
 *
 * Centralized definitions for all label mappings used throughout the application
 * This eliminates duplication of label objects across components
 */

// Role labels
export const ROLE_LABELS: Record<string, string> = {
  MEMBER: '成員',
  ADMIN: '管理員',
  OWNER: '隊長',
};

// Position labels for volleyball players
export const POSITION_LABELS: Record<string, string> = {
  OH: '主攻手',      // Outside Hitter
  MB: '中塊',        // Middle Blocker
  OP: '對角',        // Opposite
  S: '舉球員',       // Setter
  L: '自由人',       // Libero
  '': '未指定',      // Unspecified
};

// Player status labels
export const STATUS_LABELS: Record<string, string> = {
  JOINED: '已加入',
  INVITED: '待決',
  PURE_PLAYER: '純球員',
};

// Status color variants for Badge component
export const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  JOINED: 'default',
  INVITED: 'secondary',
  PURE_PLAYER: 'outline',
};

/**
 * Get label for a value from a mapping
 * Returns the value itself as fallback if not found
 */
export function getLabel(mapping: Record<string, string>, value: string): string {
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

/**
 * Get status label with fallback
 */
export function getStatusLabel(status: string): string {
  return getLabel(STATUS_LABELS, status);
}

/**
 * Get status color with fallback
 */
export function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  return STATUS_COLORS[status] || 'default';
}
