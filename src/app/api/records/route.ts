import { NextRequest, NextResponse } from "next/server";
import { createRecordController } from "@/interface/controllers/record/record.controller";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";

export const POST = async (req: NextRequest) => {
  try {
    await connectToMongoDB();
    const request = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const teamId = searchParams.get("ti");

    const input = {
      params: { teamId },
      data: {
        info: request.info,
        teams: request.teams,
      },
    };

    const record = await createRecordController(input);

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.log("[CREATE RECORD]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
