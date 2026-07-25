import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import {
  createSetController,
  updateSetController,
} from "@/interface/controllers/game/set.controller";
import { assertObjectId } from "@/lib/api/guards";
import { withErrorHandler } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ gameId: string }> },
) =>
  withErrorHandler(async (req) => {
    const { gameId } = await props.params;
    assertObjectId(gameId, "gameId");
    await connectToMongoDB();
    const request = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);

    const input = {
      params: { gameId, setIndex },
      data: {
        lineup: request.lineup,
        options: request.options,
      },
    };

    const game = await createSetController(input);

    return NextResponse.json(game, { status: 201 });
  })(_req);

export const PUT = (
  _req: NextRequest,
  props: { params: Promise<{ gameId: string }> },
) =>
  withErrorHandler(async (req) => {
    const { gameId } = await props.params;
    assertObjectId(gameId, "gameId");
    await connectToMongoDB();
    const request = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);

    const input = {
      params: { gameId, setIndex },
      data: {
        lineup: request.lineup,
        options: request.options,
      },
    };

    const game = await updateSetController(input);

    return NextResponse.json(game, { status: 200 });
  })(_req);
