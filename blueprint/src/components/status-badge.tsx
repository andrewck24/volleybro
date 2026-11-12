import { Badge } from "@/components/ui/badge";

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
