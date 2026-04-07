import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import {
  createRallyController,
  updateRallyController,
} from "@/interface/controllers/game/rally.controller";
import { withErrorHandler } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ gameId: string }> },
) =>
  withErrorHandler(async (req) => {
    await connectToMongoDB();
    const { gameId } = await props.params;
    const rally = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);
    const entryIndex = parseInt(searchParams.get("ei") || "0", 10);

    const entries = await createRallyController({
      params: { gameId, setIndex, entryIndex },
      data: rally,
    });
    return NextResponse.json(entries, { status: 200 });
  })(_req);

export const PUT = (
  _req: NextRequest,
  props: { params: Promise<{ gameId: string }> },
) =>
  withErrorHandler(async (req) => {
    await connectToMongoDB();
    const { gameId } = await props.params;
    const rally = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);
    const entryIndex = parseInt(searchParams.get("ei") || "0", 10);

    const entries = await updateRallyController({
      params: { gameId, setIndex, entryIndex },
      data: rally,
    });
    return NextResponse.json(entries, { status: 200 });
  })(_req);
