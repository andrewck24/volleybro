import { ValidationError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { findGameSummariesController } from "@/interface/controllers/game/game-summary.controller";
import { createGameController } from "@/interface/controllers/game/game.controller";
import { withErrorHandler } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

export const GET = withErrorHandler(async (req: NextRequest) => {
  await connectToMongoDB();
  const searchParams = req.nextUrl.searchParams;
  const teamId = searchParams.get("ti");
  const lastId = searchParams.get("li") ?? undefined;

  if (!teamId)
    throw new ValidationError(CommonReason.INVALID_INPUT, "teamId is required");

  const input = { params: { teamId, lastId } };
  const results = await findGameSummariesController(input);

  return NextResponse.json(results);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  await connectToMongoDB();
  const request = await req.json();
  const searchParams = req.nextUrl.searchParams;
  const teamId = searchParams.get("ti");

  if (!teamId)
    throw new ValidationError(CommonReason.INVALID_INPUT, "teamId is required");

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
