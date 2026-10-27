import { recordEntriesController } from "@/interface/controllers/game/entry.controller";
import { RecordEntriesSchema } from "@/interface/validations/game";
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
    const entries = RecordEntriesSchema.parse(await req.json());
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);

    const result = await recordEntriesController({
      params: { gameId, setIndex },
      data: entries,
    });
    return NextResponse.json(result, { status: 200 });
  })(_req);
