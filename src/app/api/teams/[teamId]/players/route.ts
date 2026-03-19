/**
 * POST /api/teams/{teamId}/players - Create Invitation or Pure Player
 * GET /api/teams/{teamId}/players - List all players in team
 */

import * as playerController from "@/interface/controllers/player/player.controller";
import { withAuth } from "@/lib/api/wrappers";
import { CreatePlayerSchema, PlayerSchema } from "@/lib/validations/player";
import { NextRequest, NextResponse } from "next/server";

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { teamId } = await props.params;

    const body = await req.json();
    const validatedData = CreatePlayerSchema.parse(body);

    const player = await playerController.createPlayer(
      teamId,
      validatedData,
      userId,
    );

    return NextResponse.json(player, { status: 201 });
  })(_req);

export const GET = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withAuth(async (_req, { userId: _userId }) => {
    const { teamId } = await props.params;

    const players = await playerController.getTeamPlayers(teamId);

    const validatedPlayers = players.map((p) => PlayerSchema.parse(p));

    return NextResponse.json(validatedPlayers, { status: 200 });
  })(_req);
