import { OBJECT_ID_RE } from "@/lib/api/guards";
import { z } from "zod";

const message = "Invalid ObjectId format";
const isObjectId = (v: string) => OBJECT_ID_RE.test(v);

export const objectId = z.string().refine(isObjectId, { message });

export const nullableObjectId = z
  .string()
  .nullable()
  .refine((v) => v === null || isObjectId(v), { message });

/**
 * A rally's `player.id` is legitimately an empty string: the recorder only
 * attributes a player to the side that acted, and the Redux draft still
 * carries the field with its unset placeholder for the other side. The
 * repository normalises it to `null` on write.
 */
export const rallyPlayerId = z
  .string()
  .refine((v) => v === "" || isObjectId(v), { message });
