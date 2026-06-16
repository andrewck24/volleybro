import { Position } from "@/entities/team";
import { z } from "zod";

const LineupPlayerSchema = z.object({
  id: z.string().nullable(),
  position: z.nativeEnum(Position).optional(),
  sub: z
    .object({
      id: z.string().nullable(),
      entryIndex: z.object({
        in: z.number().int().optional(),
        out: z.number().int().optional(),
      }),
    })
    .optional(),
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
