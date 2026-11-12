import { z } from "zod";
import { diagramBlockSchema } from "./diagram-schema.ts";
import { annotatedDiffBlockSchema } from "./annotated-diff-block.ts";
import { stepWalkthroughBlockSchema } from "./step-walkthrough-block.ts";
import {
  interactiveFlowchartBlockFieldsSchema,
  interactiveFlowchartBlockFieldsShape,
} from "./interactive-flowchart-data.ts";

const portableSpanSchema = z.looseObject({
  _type: z.literal("span"),
  marks: z.array(z.string().min(1)).optional(),
  text: z.string(),
});

const safeHrefSchema = z.string().refine((value) => {
  if (/^(?:\/|#)/u.test(value)) return true;
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, "Expected a safe link URL.");
const documentAnchorIdSchema = z
  .string()
  .regex(/^[\p{L}\p{N}][\p{L}\p{M}\p{N}_:.-]*$/u);

const markDefinitionSchema = z.looseObject({
  _key: z.string().min(1),
  _type: z.string().min(1),
  href: safeHrefSchema.optional(),
});

const textBlockSchema = z.looseObject({
  id: documentAnchorIdSchema.optional(),
  _type: z.literal("block"),
  children: z.array(portableSpanSchema),
  markDefs: z.array(markDefinitionSchema).optional(),
});

const imageBlockSchema = z.looseObject({
  _type: z.literal("image"),
  asset: z.looseObject({
    _ref: z.string().min(1),
    url: z
      .string()
      .regex(/^\/_emdash\/api\/media\/file\/[A-Za-z0-9._-]+$/u)
      .optional(),
  }),
  link: z
    .union([safeHrefSchema, z.looseObject({ href: safeHrefSchema })])
    .optional(),
});

const codeBlockSchema = z.looseObject({
  _type: z.literal("code"),
  code: z.string(),
});

const tableBlockSchema = z.looseObject({
  _type: z.literal("table"),
  rows: z.array(
    z.looseObject({
      cells: z.array(
        z.looseObject({
          content: z.array(portableSpanSchema),
          markDefs: z.array(markDefinitionSchema).optional(),
        }),
      ),
    }),
  ),
});

const standardBlockSchema = z.discriminatedUnion("_type", [
  textBlockSchema,
  imageBlockSchema,
  codeBlockSchema,
  tableBlockSchema,
]);

export type PortableTextCoreBlock = z.infer<typeof standardBlockSchema>;

const portableTextFrameBlockSchema = z.union([
  standardBlockSchema,
  diagramBlockSchema,
]);

export type PortableTextFrameBlock = z.infer<
  typeof portableTextFrameBlockSchema
>;

const typedBlock = <S extends z.ZodRawShape>(shape: S) =>
  z.strictObject({
    ...shape,
    _key: z.string().min(1).optional(),
    _version: z.number().optional(),
  });

const tldrBlockSchema = typedBlock({
  _type: z.literal("tldr"),
  blocks: z.array(standardBlockSchema),
});

export type TldrBlock = z.infer<typeof tldrBlockSchema>;

const MAX_DISCLOSURE_DEPTH = 8;

export interface DisclosureBlock {
  _type: "disclosure";
  _version?: number;
  _key?: string;
  id?: string;
  summary: string;
  blocks: ChangeBlock[];
}

function hasExcessiveDisclosureDepth(input: unknown): boolean {
  const pending: Array<{ value: unknown; depth: number }> = [
    { value: input, depth: 1 },
  ];
  while (pending.length > 0) {
    const current = pending.pop();
    if (
      !current ||
      !current.value ||
      typeof current.value !== "object" ||
      Array.isArray(current.value)
    )
      continue;
    const candidate = current.value as Record<string, unknown>;
    if (candidate._type !== "disclosure") continue;
    if (current.depth > MAX_DISCLOSURE_DEPTH) return true;
    if (!Array.isArray(candidate.blocks)) continue;
    for (const child of candidate.blocks) {
      if (
        child &&
        typeof child === "object" &&
        (child as Record<string, unknown>)._type === "disclosure"
      )
        pending.push({ value: child, depth: current.depth + 1 });
    }
  }
  return false;
}

const disclosureBlockSchema: z.ZodType<DisclosureBlock> = z.preprocess(
  (input, context) => {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      (input as Record<string, unknown>)._type !== "disclosure"
    ) {
      context.addIssue({
        code: "custom",
        message: "Expected a disclosure block.",
      });
      return z.NEVER;
    }
    return input;
  },
  z.lazy(() =>
    typedBlock({
      _type: z.literal("disclosure"),
      id: documentAnchorIdSchema.optional(),
      summary: z.string().trim().min(1),
      blocks: z.array(blockSchema),
    }),
  ),
);

const variantChoiceSchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_-]*$/u),
  label: z.string().min(1).max(120),
  options: z
    .array(
      z.strictObject({
        value: z.string().min(1).max(64),
        label: z.string().min(1).max(120),
      }),
    )
    .min(2)
    .max(20)
    .refine(
      (options) =>
        new Set(options.map(({ value }) => value)).size === options.length,
      "Variant option values must be unique.",
    ),
});

export const variantGalleryBlockSchema = typedBlock({
  _type: z.literal("variant_gallery"),
  version: z.literal(1),
  title: z.string().min(1).max(200),
  choices: z.array(variantChoiceSchema).min(1).max(4),
  defaultValues: z.record(z.string(), z.string()),
  frames: z
    .array(
      z.strictObject({
        selections: z.record(z.string(), z.string()),
        blocks: z.array(portableTextFrameBlockSchema).min(1).max(200),
      }),
    )
    .min(1)
    .max(256),
}).superRefine((gallery, context) => {
  const choiceIds = gallery.choices.map(({ id }) => id);
  if (new Set(choiceIds).size !== choiceIds.length) {
    context.addIssue({
      code: "custom",
      path: ["choices"],
      message: "Variant choice IDs must be unique.",
    });
    return;
  }

  const optionsByChoice = new Map(
    gallery.choices.map(({ id, options }) => [
      id,
      new Set(options.map(({ value }) => value)),
    ]),
  );
  const expectedKeys = [...choiceIds].sort();
  const validateSelection = (
    selection: Record<string, string>,
    path: (string | number)[],
  ) => {
    const keys = Object.keys(selection).sort();
    if (
      keys.length !== expectedKeys.length ||
      keys.some((key, index) => key !== expectedKeys[index])
    ) {
      context.addIssue({
        code: "custom",
        path,
        message:
          "Every variant selection must specify each choice exactly once.",
      });
      return false;
    }
    let isValid = true;
    for (const [id, value] of Object.entries(selection)) {
      if (!optionsByChoice.get(id)?.has(value)) {
        context.addIssue({
          code: "custom",
          path: [...path, id],
          message: "Variant selection uses an unknown choice value.",
        });
        isValid = false;
      }
    }
    return isValid;
  };

  const hasValidDefaults = validateSelection(gallery.defaultValues, [
    "defaultValues",
  ]);
  const frameKeys = new Set<string>();
  gallery.frames.forEach(({ selections }, index) => {
    if (!validateSelection(selections, ["frames", index, "selections"])) return;
    const key = JSON.stringify(expectedKeys.map((id) => [id, selections[id]]));
    if (frameKeys.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["frames", index, "selections"],
        message: "Variant frame selections must be unique.",
      });
    }
    frameKeys.add(key);
  });

  const expectedFrameCount = gallery.choices.reduce(
    (count, { options }) => count * options.length,
    1,
  );
  if (gallery.frames.length !== expectedFrameCount) {
    context.addIssue({
      code: "custom",
      path: ["frames"],
      message:
        "Variant gallery must provide one frame for every choice combination.",
    });
  }
  if (hasValidDefaults) {
    const defaultKey = JSON.stringify(
      expectedKeys.map((id) => [id, gallery.defaultValues[id]]),
    );
    if (!frameKeys.has(defaultKey)) {
      context.addIssue({
        code: "custom",
        path: ["defaultValues"],
        message: "Variant gallery must include its default selection frame.",
      });
    }
  }
});

export type VariantGalleryBlock = z.infer<typeof variantGalleryBlockSchema>;

const bylineSummarySchema = z.strictObject({
  id: z.string(),
  slug: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  avatarMediaId: z.string().nullable(),
  avatarStorageKey: z.string().nullable().optional(),
  avatarAlt: z.string().nullable().optional(),
  avatarBlurhash: z.string().nullable().optional(),
  avatarDominantColor: z.string().nullable().optional(),
  websiteUrl: z.string().nullable(),
  userId: z.string().nullable(),
  isGuest: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  locale: z.string(),
  translationGroup: z.string().nullable(),
  customFields: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.null()]))
    .optional(),
});

const taxonomyTermSchema: z.ZodType = z.lazy(() =>
  z.strictObject({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    label: z.string(),
    parentId: z.string().nullable().optional(),
    children: z.array(taxonomyTermSchema),
    locale: z.string(),
    translationGroup: z.string(),
  }),
);

const blockSchemaBase = z.union([
  standardBlockSchema,
  diagramBlockSchema,
  variantGalleryBlockSchema,
  tldrBlockSchema,
  disclosureBlockSchema,
  annotatedDiffBlockSchema,
  stepWalkthroughBlockSchema,
  typedBlock({
    _type: z.literal("decision_cards"),
    records: z.string(),
  }),
  typedBlock({
    _type: z.literal("risk_table"),
    risks: z.string(),
  }),
  typedBlock({
    _type: z.literal("scenario"),
    id: z.string().min(1),
    given: z.string(),
    when: z.string(),
    then: z.string(),
  }),
  typedBlock({
    _type: z.literal("scenario_cards"),
    items: z.string(),
  }),
  typedBlock({
    _type: z.literal("interactive_flowchart"),
    ...interactiveFlowchartBlockFieldsShape,
  }).superRefine((block, context) => {
    const parsed = interactiveFlowchartBlockFieldsSchema.safeParse({
      source: block.source,
      details: block.details,
      paths: block.paths,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({ ...issue, path: issue.path });
      }
    }
  }),
]);

export const blockSchema = z.preprocess((input, context) => {
  if (hasExcessiveDisclosureDepth(input)) {
    context.addIssue({
      code: "custom",
      message: `Disclosures cannot be nested more than ${MAX_DISCLOSURE_DEPTH} levels.`,
    });
    return z.NEVER;
  }
  return input;
}, blockSchemaBase);

const changeDataBaseSchema = z.strictObject({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  linear_issue: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*-[1-9]\d*$/u)
    .optional(),
  pull_requests: z
    .array(
      z.strictObject({
        url: z
          .string()
          .regex(
            /^https:\/\/github\.com\/andrewck24\/volleybro\/pull\/[1-9]\d*$/u,
          ),
      }),
    )
    .max(12)
    .default([]),
  capabilities: z
    .array(
      z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/u),
    )
    .max(12)
    .default([]),
  blocks: z.array(blockSchema),
  id: z.string().optional(),
  slug: z.string().optional(),
  status: z.string().optional(),
  authorId: z.string().nullable().optional(),
  primaryBylineId: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
  publishedAt: z.date().or(z.string()).nullable().optional(),
  scheduledAt: z.date().or(z.string()).nullable().optional(),
  draftRevisionId: z.string().nullable().optional(),
  liveRevisionId: z.string().nullable().optional(),
  locale: z.string().optional(),
  translationGroup: z.string().nullable().optional(),
  seo: z
    .strictObject({
      title: z.string().nullable(),
      description: z.string().nullable(),
      image: z.string().nullable(),
      canonical: z.string().nullable(),
      noIndex: z.boolean(),
    })
    .optional(),
  bylines: z
    .array(
      z.strictObject({
        roleLabel: z.string().nullable(),
        sortOrder: z.number(),
        source: z.enum(["explicit", "inferred"]).optional(),
        byline: bylineSummarySchema,
      }),
    )
    .optional(),
  byline: bylineSummarySchema.nullable().optional(),
  terms: z.record(z.string(), z.array(taxonomyTermSchema)).optional(),
});

export const changeDataSchema = changeDataBaseSchema.transform((data) => ({
  ...data,
  description: data.description ?? undefined,
}));

export type ChangeBlock = z.infer<typeof blockSchema>;
export type ChangeData = z.infer<typeof changeDataSchema>;
export type EmDashChangeEntry = { id: string; data: ChangeData };

export const acceptedContentSchema = z.strictObject({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  linear_issue: z
    .string()
    .regex(/^[A-Z][A-Z0-9]*-[1-9]\d*$/u)
    .optional(),
  blocks: z.array(blockSchema),
});

export function omitCmsKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitCmsKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "_key")
      .map(([key, child]) => [key, omitCmsKeys(child)]),
  );
}

function acceptedHashProjection(value: z.infer<typeof acceptedContentSchema>) {
  return {
    ...value,
    blocks: value.blocks.map(omitCmsKeys),
  };
}

export function canonicalizeContentValue(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(canonicalizeContentValue).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalizeContentValue(record[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function hashValidatedAcceptedContent(
  value: z.infer<typeof acceptedContentSchema>,
): Promise<string> {
  const content = acceptedHashProjection(value);
  const bytes = new TextEncoder().encode(canonicalizeContentValue(content));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function acceptedContentHashFromValidatedChange(
  value: ChangeData,
): Promise<string> {
  return hashValidatedAcceptedContent({
    title: value.title,
    description: value.description ?? undefined,
    linear_issue: value.linear_issue,
    blocks: value.blocks,
  });
}

export async function acceptedContentHash(value: unknown): Promise<string> {
  const stored = changeDataSchema.safeParse(value);
  if (!stored.success)
    throw new Error(
      "Change content does not match the accepted EmDash schema.",
    );
  return acceptedContentHashFromValidatedChange(stored.data);
}

export function parseJsonField<T>(
  value: string,
  schema: z.ZodType<T>,
  field: string,
): T {
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    throw new Error(`Change block field "${field}" is not valid JSON.`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    throw new Error(`Change block field "${field}" does not match its schema.`);
  return parsed.data;
}
