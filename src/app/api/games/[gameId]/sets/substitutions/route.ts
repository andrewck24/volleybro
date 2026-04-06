import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { createSubstitutionController } from "@/interface/controllers/game/substitution.controller";
import { withErrorHandler } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ gameId: string }> },
) =>
  withErrorHandler(async (req) => {
    await connectToMongoDB();
    const { gameId } = await props.params;
    const substitution = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);
    const entryIndex = parseInt(searchParams.get("ei") || "0", 10);

    const entries = await createSubstitutionController({
      params: { gameId, setIndex, entryIndex },
      data: substitution,
    });
    return NextResponse.json(entries, { status: 200 });
  })(_req);
