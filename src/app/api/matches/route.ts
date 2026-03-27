import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { findMatchesController } from "@/interface/controllers/record/match.controller";
import { withErrorHandler } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

export const GET = withErrorHandler(async (req: NextRequest) => {
  await connectToMongoDB();
  const searchParams = req.nextUrl.searchParams;
  const teamId = searchParams.get("ti") ?? "";
  const lastId = searchParams.get("li") ?? undefined;

  const input = { params: { teamId, lastId } };

  const results = await findMatchesController(input);

  return NextResponse.json(results);
});
