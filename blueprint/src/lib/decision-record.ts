import { z } from "zod";

const nonEmptyText = z.string().min(1);
const decisionId = z.string().regex(/^[0-9]{4}$/);

const decisionRecordSchema = z.strictObject({
  schemaVersion: z.literal(2),
  id: decisionId,
  title: nonEmptyText,
  capabilities: z
    .array(z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)+$/))
    .min(1)
    .refine((items) => new Set(items).size === items.length, {
      message: "must not repeat a capability",
    }),
  decision: nonEmptyText,
  context: nonEmptyText.optional(),
  alternatives: z
    .array(z.strictObject({ option: nonEmptyText, reason: nonEmptyText }))
    .optional(),
  consequences: z.array(nonEmptyText).min(1).optional(),
  revisitTriggers: z.array(nonEmptyText).min(1).optional(),
  originChange: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  supersededBy: decisionId.optional(),
});

export type DecisionRecord = z.infer<typeof decisionRecordSchema>;

export function parseDecisionRecord(value: unknown): DecisionRecord {
  const result = decisionRecordSchema.safeParse(value);
  if (result.success) return result.data;

  const id =
    typeof value === "object" && value !== null && "id" in value
      ? String(value.id)
      : "unknown";
  const issues = result.error.issues
    .map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid decision record: ${id} — ${issues}`);
}
