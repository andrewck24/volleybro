import { Position } from "@/entities/team";
import { z } from "zod";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const objectId = z
  .string()
  .nullable()
  .refine((v) => v === null || OBJECT_ID_RE.test(v), {
    message: "Invalid ObjectId format",
  });

const LineupPlayerSchema = z.object({
  id: objectId,
  position: z.nativeEnum(Position).optional(),
  sub: z
    .object({
      id: objectId,
      entryIndex: z.object({
        in: z.number().int().optional(),
        out: z.number().int().optional(),
      }),
    })
    .optional(),
});

export const TeamUpdateSchema = z.object({
  name: z.string().optional(),
  nickname: z.string().optional(),
});

const LineupSchema = z.object({
  options: z.object({
    liberoReplaceMode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    liberoReplacePosition: z.enum([
      Position.NONE,
      Position.OH,
      Position.MB,
      Position.OP,
    ]),
  }),
  starting: z.array(LineupPlayerSchema),
  liberos: z.array(LineupPlayerSchema),
  substitutes: z.array(LineupPlayerSchema),
});

export const UpdateLineupsSchema = z.array(LineupSchema);
