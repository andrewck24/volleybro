import type { PlayerRole } from "@/entities/player";
import * as membershipController from "@/interface/controllers/player/membership.controller";
import { withAuth } from "@/lib/api/wrappers";
import {
  ManagePlayerMembershipSchema,
  PlayerSchema,
  UpdatePlayerRoleSchema,
} from "@/lib/validations/player";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/players/{playerId}/memberships - Invite existing PURE_PLAYER
 * PATCH /api/players/{playerId}/memberships - Update player role
 * DELETE /api/players/{playerId}/memberships - Cancel invitation
 */

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ playerId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { playerId } = await props.params;

    const body = await req.json();
    const validatedData = ManagePlayerMembershipSchema.parse(body);

    const player = await membershipController.createInvitation({
      playerId,
      email: validatedData.email,
      role: validatedData.role as PlayerRole,
      userId,
    });

    const validatedPlayer = PlayerSchema.parse(player);
    return NextResponse.json(validatedPlayer, { status: 201 });
  })(_req);

export const PATCH = (
  _req: NextRequest,
  props: { params: Promise<{ playerId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { playerId } = await props.params;

    const body = await req.json();
    const validatedData = UpdatePlayerRoleSchema.parse(body);

    const player = await membershipController.updateRole({
      playerId,
      newRole: validatedData.role as PlayerRole,
      userId,
    });

    const validatedPlayer = PlayerSchema.parse(player);
    return NextResponse.json(validatedPlayer, { status: 200 });
  })(_req);

export const DELETE = (
  _req: NextRequest,
  props: { params: Promise<{ playerId: string }> },
) =>
  withAuth(async (_req, { userId }) => {
    const { playerId } = await props.params;

    const player = await membershipController.cancelInvitation({
      playerId,
      userId,
    });

    const validatedPlayer = PlayerSchema.parse(player);
    return NextResponse.json(validatedPlayer, { status: 200 });
  })(_req);
