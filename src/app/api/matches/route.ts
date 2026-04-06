import { ValidationError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { findMatchesController } from "@/interface/controllers/game/match.controller";
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

  const results = await findMatchesController(input);

  return NextResponse.json(results);
});
