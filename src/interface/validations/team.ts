import type { ICreateTeamInput } from "@/applications/usecases/team/create-team.usecase";
import { Position } from "@/entities/team";
import { nullableObjectId } from "@/interface/validations/object-id";
import { z } from "zod";

const LineupPlayerSchema = z
  .object({
    id: nullableObjectId,
    position: z.nativeEnum(Position).optional(),
    sub: z
      .object({
        id: nullableObjectId,
        entryIndex: z
          .object({
            in: z.number().int().optional(),
            out: z.number().int().optional(),
          })
          .strict(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const TeamUpdateSchema = z
  .object({
    name: z.string().optional(),
    nickname: z.string().optional(),
  })
  .strict();

export const LineupSchema = z
  .object({
    options: z
      .object({
        liberoReplaceMode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        liberoReplacePosition: z.enum([
          Position.NONE,
          Position.OH,
          Position.MB,
          Position.OP,
        ]),
      })
      .strict(),
    starting: z.array(LineupPlayerSchema),
    liberos: z.array(LineupPlayerSchema),
    substitutes: z.array(LineupPlayerSchema),
  })
  .strict();

export const UpdateLineupsSchema = z.array(LineupSchema);

/** POST /api/teams */
export const CreateTeamSchema = z
  .object({
    name: z.string().min(1),
    nickname: z.string().optional(),
  })
  .strict() satisfies z.ZodType<Pick<ICreateTeamInput, "name" | "nickname">>;
