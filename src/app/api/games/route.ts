import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { createGameController } from "@/interface/controllers/game/game.controller";
import { withErrorHandler } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

export const POST = withErrorHandler(async (req: NextRequest) => {
  await connectToMongoDB();
  const request = await req.json();
  const searchParams = req.nextUrl.searchParams;
  const teamId = searchParams.get("ti") ?? "";

  const input = {
    params: { teamId },
    data: {
      info: request.info,
      teams: request.teams,
    },
  };

  const game = await createGameController(input);

  return NextResponse.json(game, { status: 201 });
});
