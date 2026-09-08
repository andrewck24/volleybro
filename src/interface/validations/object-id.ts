import { OBJECT_ID_RE } from "@/lib/api/guards";
import { z } from "zod";

const message = "Invalid ObjectId format";
const isObjectId = (v: string) => OBJECT_ID_RE.test(v);

export const objectId = z.string().refine(isObjectId, { message });

export const nullableObjectId = z
  .string()
  .nullable()
  .refine((v) => v === null || isObjectId(v), { message });

// Empty means the recorder attributed nobody to that side.
// See the request-schema-boundary Overview.
export const rallyPlayerId = z
  .string()
  .refine((v) => v === "" || isObjectId(v), { message });
