import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { recordRalliesController } from "@/interface/controllers/game/rally.controller";
import { assertObjectId } from "@/lib/api/guards";
import { withErrorHandler } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

export const PUT = (
  _req: NextRequest,
  props: { params: Promise<{ gameId: string }> },
) =>
  withErrorHandler(async (req) => {
    const { gameId } = await props.params;
    assertObjectId(gameId, "gameId");
    await connectToMongoDB();
    const rallies = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);

    const result = await recordRalliesController({
      params: { gameId, setIndex },
      data: rallies,
    });
    return NextResponse.json(result, { status: 200 });
  })(_req);
