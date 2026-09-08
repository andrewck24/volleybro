import type { IUpdateProfileInput } from "@/applications/usecases/user/profile.usecase";
import { z } from "zod";

/** PATCH /api/profiles */
export const UpdateProfileRequestSchema = z
  .object({
    activeTeamId: z.string().optional(),
    info: z.record(z.string(), z.unknown()).optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
  })
  .strict() satisfies z.ZodType<IUpdateProfileInput["updates"]>;

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
