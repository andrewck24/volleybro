import * as playerController from "@/interface/controllers/player/player.controller";
import { assertObjectId } from "@/lib/api/guards";
import { withAuth } from "@/lib/api/wrappers";
import { CreatePlayerSchema, PlayerSchema } from "@/lib/validations/player";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/teams/{teamId}/players - Create Invitation or Pure Player
 * GET /api/teams/{teamId}/players - List all players in team
 */

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { teamId } = await props.params;
    assertObjectId(teamId, "teamId");

    const body = await req.json();
    const validatedData = CreatePlayerSchema.parse(body);

    const player = await playerController.createPlayer({
      teamId,
      data: validatedData,
      userId,
    });

    return NextResponse.json(player, { status: 201 });
  })(_req);

export const GET = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withAuth(async (_req, { userId: _userId }) => {
    const { teamId } = await props.params;
    assertObjectId(teamId, "teamId");

    const players = await playerController.getTeamPlayers({ teamId });

    const validatedPlayers = players.map((p) => PlayerSchema.parse(p));

    return NextResponse.json(validatedPlayers, { status: 200 });
  })(_req);
