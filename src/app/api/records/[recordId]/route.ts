import { NextRequest, NextResponse } from "next/server";
import { findRecordController } from "@/interface/controllers/record/record.controller";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";

export const GET = async (
  req: NextRequest,
  props: { params: Promise<{ recordId: string }> }
) => {
  try {
    await connectToMongoDB();
    const params = await props.params;
    const { recordId } = params;
    const input = { params: { _id: recordId } };

    const record = await findRecordController(input);

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    console.log("[GET /api/records]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
