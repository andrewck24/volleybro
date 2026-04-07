import { PlayerRole, PlayerStatus, Position } from "@/entities/player";
import { z } from "zod";

/**
 * Zod validation schemas for Player entity
 * Provides type-safe runtime validation for API requests and data transformations
 */

export const PlayerRoleSchema = z.nativeEnum(PlayerRole);
export const PlayerStatusSchema = z.nativeEnum(PlayerStatus);
export const PositionSchema = z.nativeEnum(Position);

/**
 * Complete Player schema for internal use
 */
export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  number: z.number().int().min(0).max(99).optional(),
  position: PositionSchema.optional(),
  status: PlayerStatusSchema,
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
 * Schema for updating player role (MEMBER or ADMIN only, not OWNER)
 */
const MemberAdminRoleSchema = z.enum([PlayerRole.MEMBER, PlayerRole.ADMIN]);

export const UpdatePlayerRoleSchema = z.object({
  role: MemberAdminRoleSchema,
});

export type UpdatePlayerRoleInput = z.infer<typeof UpdatePlayerRoleSchema>;

/**
 * Schema for creating an invitation to an existing PURE_PLAYER
 * POST /api/players/{playerId}/memberships
 */
export const ManagePlayerMembershipSchema = z.object({
  email: z.email("請輸入有效的電子郵件"),
  role: MemberAdminRoleSchema.default(PlayerRole.MEMBER),
});

export type ManagePlayerMembershipInput = z.infer<
  typeof ManagePlayerMembershipSchema
>;

/**
 * Schema for invitation response (accept/reject)
 * PATCH /api/players/{playerId}/invitations
 */
export const InvitationResponseSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export type InvitationResponseInput = z.infer<typeof InvitationResponseSchema>;

/**
 * Schema for transferring team ownership
 * POST /api/teams/{teamId}/ownership
 */
export const TransferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1, "請選擇新的隊伍擁有者"),
});

export type TransferOwnershipInput = z.infer<typeof TransferOwnershipSchema>;

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
