/**
 * GET /api/users/{userId}/players - Retrieve all teams/players for a user
 */

import { AuthorizationError } from "@/entities/errors/app-error";
import { AuthReason } from "@/entities/errors/reasons/auth";
import * as playerController from "@/interface/controllers/player/player.controller";
import { withAuth } from "@/lib/api/wrappers";
import { PlayerSchema } from "@/lib/validations/player";
import { NextRequest, NextResponse } from "next/server";

export const GET = (
  req: NextRequest,
  props: { params: Promise<{ userId: string }> },
) =>
  withAuth(async (req, { userId: requestingUserId }) => {
    const { userId: targetUserId } = await props.params;

    if (requestingUserId !== targetUserId) {
      throw new AuthorizationError(
        AuthReason.INSUFFICIENT_ROLE,
        "Cannot access other user's players",
      );
    }

    const players = await playerController.getUserPlayers(targetUserId);

    const validatedPlayers = players.map((p) => PlayerSchema.parse(p));

    return NextResponse.json(validatedPlayers, { status: 200 });
  })(req);
