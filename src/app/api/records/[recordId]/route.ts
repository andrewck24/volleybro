import { NextRequest, NextResponse } from "next/server";
import { findRecordController } from "@/interface/controllers/record/record.controller";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { withErrorHandler } from "@/lib/api/wrappers";

export const GET = (
  req: NextRequest,
  props: { params: Promise<{ recordId: string }> },
) =>
  withErrorHandler(async (req) => {
    await connectToMongoDB();
    const { recordId } = await props.params;
    const input = { params: { _id: recordId } };

    const record = await findRecordController(input);

    return NextResponse.json(record, { status: 200 });
  })(req);
