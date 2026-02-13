/**
 * GET /api/users/{userId}/players - Retrieve all teams/players for a user
 */

import * as playerController from "@/interface/controllers/player/player.controller";
import { auth } from "@/lib/auth";
import { PlayerSchema } from "@/lib/validations/player";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestingUserId = session.user.id;
    const { userId: targetUserId } = await params;

    if (requestingUserId !== targetUserId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access other user's players" },
        { status: 403 },
      );
    }

    const players = await playerController.getUserPlayers(targetUserId);

    const validatedPlayers = players.map((p) => PlayerSchema.parse(p));

    return NextResponse.json(validatedPlayers, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid response data", details: error.issues },
        { status: 500 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
