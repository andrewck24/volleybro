export const ROLE_LABELS: Record<string, string> = {
  MEMBER: "一般成員",
  ADMIN: "管理員",
};

export const OWNER_LABEL = "擁有者";

export const POSITION_LABELS: Record<string, string> = {
  OH: "Outside Hitter",
  MB: "Middle Blocker",
  OP: "Opposite",
  S: "Setter",
  L: "Libero",
  "": "Unspecified",
};

export function getLabel(
  mapping: Record<string, string>,
  value: string,
): string {
  return mapping[value] || value;
}

export function getRoleLabel(role: string): string {
  return getLabel(ROLE_LABELS, role);
}

export function getPositionLabel(position: string): string {
  return getLabel(POSITION_LABELS, position);
}
