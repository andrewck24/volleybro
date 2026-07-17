/**
 * GET /api/users/{userId}/players - Retrieve all teams/players for a user
 */

import { AuthorizationError, AuthReason } from "@/entities/errors";
import * as playerController from "@/interface/controllers/player/player.controller";
import { withAuth } from "@/lib/api/wrappers";
import { PlayerSchema } from "@/lib/validations/player";
import { NextRequest, NextResponse } from "next/server";

export const GET = (
  _req: NextRequest,
  props: { params: Promise<{ userId: string }> },
) =>
  withAuth(async (_req, { userId: requestingUserId }) => {
    const { userId: targetUserId } = await props.params;

    if (requestingUserId !== targetUserId) {
      throw new AuthorizationError(
        AuthReason.INSUFFICIENT_ROLE,
        "Cannot access other user's players",
      );
    }

    const players = await playerController.getUserPlayers({
      userId: targetUserId,
    });

    const validatedPlayers = players.map((p) => PlayerSchema.parse(p));

    return NextResponse.json(validatedPlayers, { status: 200 });
  })(_req);
