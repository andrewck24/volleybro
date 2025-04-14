import { NextRequest, NextResponse } from "next/server";
import { createRecordController } from "@/interface/controllers/record/record.controller";

export const POST = async (req: NextRequest) => {
  try {
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
