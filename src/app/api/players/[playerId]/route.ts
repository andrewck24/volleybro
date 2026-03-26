/**
 * GET /api/players/{playerId} - Get Single Player
 * PATCH /api/players/{playerId} - Update Player Info
 * DELETE /api/players/{playerId} - Remove Player
 */

import * as playerController from "@/interface/controllers/player/player.controller";
import { withAuth } from "@/lib/api/wrappers";
import { PlayerSchema, UpdatePlayerInfoSchema } from "@/lib/validations/player";
import { NextRequest, NextResponse } from "next/server";

export const GET = (
  _req: NextRequest,
  props: { params: Promise<{ playerId: string }> },
) =>
  withAuth(async (_req, { userId: _userId }) => {
    const { playerId } = await props.params;

    const player = await playerController.getPlayer(playerId);
    const validatedPlayer = PlayerSchema.parse(player);
    return NextResponse.json(validatedPlayer, { status: 200 });
  })(_req);

export const PATCH = (
  _req: NextRequest,
  props: { params: Promise<{ playerId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { playerId } = await props.params;

    const body = await req.json();
    const validatedData = UpdatePlayerInfoSchema.parse(body);

    const updatedPlayer = await playerController.updatePlayer(
      playerId,
      validatedData,
      userId,
    );

    const validatedPlayer = PlayerSchema.parse(updatedPlayer);
    return NextResponse.json(validatedPlayer, { status: 200 });
  })(_req);

export const DELETE = (
  _req: NextRequest,
  props: { params: Promise<{ playerId: string }> },
) =>
  withAuth(async (_req, { userId }) => {
    const { playerId } = await props.params;

    await playerController.removePlayer(playerId, userId);

    return NextResponse.json(
      { success: true, message: "Player removed successfully" },
      { status: 200 },
    );
  })(_req);
