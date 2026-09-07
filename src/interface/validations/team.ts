import type { ICreateTeamInput } from "@/applications/usecases/team/create-team.usecase";
import { Position } from "@/entities/team";
import { OBJECT_ID_RE } from "@/lib/api/guards";
import { z } from "zod";

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

export const TeamUpdateSchema = z
  .object({
    name: z.string().optional(),
    nickname: z.string().optional(),
  })
  .strict();

const LineupSchema = z
  .object({
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
  })
  .strict();

export const UpdateLineupsSchema = z.array(LineupSchema);

/**
 * Schema for creating a new team
 * POST /api/teams
 */
export const CreateTeamSchema = z
  .object({
    name: z.string().min(1),
    nickname: z.string().optional(),
  })
  .strict() satisfies z.ZodType<Pick<ICreateTeamInput, "name" | "nickname">>;
