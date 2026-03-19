import { NextRequest, NextResponse } from "next/server";
import {
  createSetController,
  updateSetController,
} from "@/interface/controllers/record/set.controller";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { withErrorHandler } from "@/lib/api/wrappers";

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ recordId: string }> },
) =>
  withErrorHandler(async (req) => {
    await connectToMongoDB();
    const { recordId } = await props.params;
    const request = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);

    const input = {
      params: { recordId, setIndex },
      data: {
        lineup: request.lineup,
        options: request.options,
      },
    };

    const record = await createSetController(input);

    return NextResponse.json(record, { status: 201 });
  })(_req);

export const PUT = (
  _req: NextRequest,
  props: { params: Promise<{ recordId: string }> },
) =>
  withErrorHandler(async (req) => {
    await connectToMongoDB();
    const { recordId } = await props.params;
    const request = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);

    const input = {
      params: { recordId, setIndex },
      data: { options: request.options },
    };

    const record = await updateSetController(input);

    return NextResponse.json(record, { status: 200 });
  })(_req);
