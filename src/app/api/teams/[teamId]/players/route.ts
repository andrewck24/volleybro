/**
 * POST /api/teams/{teamId}/players - Create Invitation or Pure Player
 * GET /api/teams/{teamId}/players - List all players in team
 */

import * as playerController from "@/interface/controllers/player/player.controller";
import { auth } from "@/lib/auth";
import { CreatePlayerSchema, PlayerSchema } from "@/lib/validations/player";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { teamId } = await params;

    const body = await req.json();
    const validatedData = CreatePlayerSchema.parse(body);

    const player = await playerController.createPlayer(
      teamId,
      validatedData,
      userId,
    );

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (error.message.includes("not admin")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (
        error.message.includes("already exists") ||
        error.message.includes("Invalid")
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId } = await params;

    const players = await playerController.getTeamPlayers(teamId);

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
