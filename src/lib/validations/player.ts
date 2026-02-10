import { PlayerRole, Position } from "@/entities/player";
import { z } from "zod";

/**
 * Zod validation schemas for Player entity
 * Provides type-safe runtime validation for API requests and data transformations
 */

export const PlayerRoleSchema = z.nativeEnum(PlayerRole);
export const PositionSchema = z.nativeEnum(Position);

/**
 * Complete Player schema for internal use
 */
export const PlayerSchema = z.object({
  _id: z.string(),
  name: z.string().min(1, "Name is required"),
  number: z.number().int().min(0).max(99).optional(),
  position: PositionSchema.optional(),
  teamId: z.string().nullish(),
  userId: z.string().nullish(),
  email: z.email("Invalid email format").nullish(),
  role: PlayerRoleSchema.nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Player = z.infer<typeof PlayerSchema>;

/**
 * Schema for creating a new player (with or without email for invitation)
 */
export const CreatePlayerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  number: z.number().int().min(0).max(99).optional(),
  position: PositionSchema.optional(),
  role: PlayerRoleSchema.default(PlayerRole.MEMBER),
  email: z.email("Invalid email format").optional(), // Has email = invitation, no email = pure player
});

export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;

/**
 * Schema for updating player information (name, number, position)
 */
export const UpdatePlayerInfoSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  number: z.number().int().min(0).max(99).optional(),
  position: PositionSchema.optional(),
});

export type UpdatePlayerInfoInput = z.infer<typeof UpdatePlayerInfoSchema>;

/**
 * Schema for updating player role
 */
export const UpdatePlayerRoleSchema = z.object({
  role: PlayerRoleSchema,
});

export type UpdatePlayerRoleInput = z.infer<typeof UpdatePlayerRoleSchema>;

/**
 * Discriminated union for status change operations
 * - invite: Create invitation with email
 * - cancel: Cancel pending invitation
 * - accept: Accept invitation (user action)
 * - reject: Reject invitation (user action)
 * - leave: Leave team (clear userId)
 */
export const UpdatePlayerStatusSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    email: z.email("Please enter a valid email address"),
  }),
  z.object({
    action: z.literal("cancel"),
  }),
  z.object({
    action: z.literal("accept"),
  }),
  z.object({
    action: z.literal("reject"),
  }),
  z.object({
    action: z.literal("leave"),
  }),
]);

export type UpdatePlayerStatusInput = z.infer<typeof UpdatePlayerStatusSchema>;
