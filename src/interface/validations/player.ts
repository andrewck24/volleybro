import type { ICreatePlayerInput } from "@/applications/usecases/player/create-player.usecase";
import type { ICreateInvitationInput } from "@/applications/usecases/player/create-invitation.usecase";
import type { ITransferOwnershipInput } from "@/applications/usecases/player/transfer-ownership.usecase";
import type { IUpdatePlayerInfoInput } from "@/applications/usecases/player/update-player-info.usecase";
import { PlayerRole, PlayerStatus, Position } from "@/entities/player";
import { z } from "zod";

const PlayerRoleSchema = z.nativeEnum(PlayerRole);
const PlayerStatusSchema = z.nativeEnum(PlayerStatus);
const PositionSchema = z.nativeEnum(Position);

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

/** POST /api/teams/{teamId}/players */
export const CreatePlayerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    number: z.number().int().min(0).max(99).optional(),
    position: PositionSchema.optional(),
    role: PlayerRoleSchema.default(PlayerRole.MEMBER),
    email: z.email("Invalid email format").optional(), // Has email = invitation, no email = pure player
  })
  .strict() satisfies z.ZodType<ICreatePlayerInput["data"]>;

export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;

/** PATCH /api/players/{playerId} */
export const UpdatePlayerInfoSchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    number: z.number().int().min(0).max(99).optional(),
    position: PositionSchema.optional(),
  })
  .strict() satisfies z.ZodType<IUpdatePlayerInfoInput["updates"]>;

export type UpdatePlayerInfoInput = z.infer<typeof UpdatePlayerInfoSchema>;

/** PATCH /api/players/{playerId}/memberships */
const MemberAdminRoleSchema = z.enum([PlayerRole.MEMBER, PlayerRole.ADMIN]);

export const UpdatePlayerRoleSchema = z
  .object({
    role: MemberAdminRoleSchema,
  })
  .strict();

export type UpdatePlayerRoleInput = z.infer<typeof UpdatePlayerRoleSchema>;

/** POST /api/players/{playerId}/memberships */
export const ManagePlayerMembershipSchema = z
  .object({
    email: z.email("請輸入有效的電子郵件"),
    role: MemberAdminRoleSchema.default(PlayerRole.MEMBER),
  })
  .strict() satisfies z.ZodType<Pick<ICreateInvitationInput, "email" | "role">>;

export type ManagePlayerMembershipInput = z.infer<
  typeof ManagePlayerMembershipSchema
>;

/** PATCH /api/players/{playerId}/invitations — dispatch schema, see `request-schema-boundary` D2. */
export const PatchInvitationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }).strict(),
  z.object({ action: z.literal("reject") }).strict(),
  z.object({ action: z.literal("leave") }).strict(),
]);

export type PatchInvitationInput = z.infer<typeof PatchInvitationSchema>;

/** POST /api/teams/{teamId}/ownership */
export const TransferOwnershipSchema = z
  .object({
    newOwnerId: z.string().min(1, "請選擇新的隊伍擁有者"),
  })
  .strict() satisfies z.ZodType<Pick<ITransferOwnershipInput, "newOwnerId">>;

export type TransferOwnershipInput = z.infer<typeof TransferOwnershipSchema>;
