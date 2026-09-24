import { Badge } from "@/components/ui/badge";

// Feature delivery status, mapped onto existing Badge variants (no new variants):
// Shipped → default (primary), In Progress → secondary, Planned → outline.
const STATUS = {
  shipped: { label: "Shipped", variant: "default" },
  "in-progress": { label: "In Progress", variant: "secondary" },
  planned: { label: "Planned", variant: "outline" },
} as const;

export type FeatureStatus = keyof typeof STATUS;

export function StatusBadge({ status }: { status: FeatureStatus }) {
  const { label, variant } = STATUS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
