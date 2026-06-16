import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { findGameController } from "@/interface/controllers/game/game.controller";
import { assertObjectId } from "@/lib/api/guards";
import { withErrorHandler } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

export const GET = (
  _req: NextRequest,
  props: { params: Promise<{ gameId: string }> },
) =>
  withErrorHandler(async (_req) => {
    const { gameId } = await props.params;
    assertObjectId(gameId, "gameId");
    await connectToMongoDB();
    const input = { params: { id: gameId } };

    const game = await findGameController(input);

    return NextResponse.json(game, { status: 200 });
  })(_req);
