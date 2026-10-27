import { createSubstitutionController } from "@/interface/controllers/game/substitution.controller";
import { CreateSubstitutionSchema } from "@/interface/validations/game";
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
    const substitution = CreateSubstitutionSchema.parse(await req.json());
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);

    const entries = await createSubstitutionController({
      params: { gameId, setIndex },
      data: substitution,
    });
    return NextResponse.json(entries, { status: 200 });
  })(_req);
