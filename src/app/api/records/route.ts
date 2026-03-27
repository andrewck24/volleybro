import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { createRecordController } from "@/interface/controllers/record/record.controller";
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

  const record = await createRecordController(input);

  return NextResponse.json(record, { status: 201 });
});
