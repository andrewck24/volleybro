import { NextRequest, NextResponse } from "next/server";
import {
  createRallyController,
  updateRallyController,
} from "@/interface/controllers/record/rally.controller";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";

export const POST = async (
  req: NextRequest,
  props: { params: Promise<{ recordId: string }> }
) => {
  try {
    await connectToMongoDB();
    const params = await props.params;
    const { recordId } = params;
    const rally = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);
    const entryIndex = parseInt(searchParams.get("ei") || "0", 10);

    const entries = await createRallyController({
      params: { recordId, setIndex, entryIndex },
      data: rally,
    });
    return NextResponse.json(entries, { status: 200 });
  } catch (error) {
    console.log("[POST /api/records/sets/rallies]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const PUT = async (
  req: NextRequest,
  props: { params: Promise<{ recordId: string }> }
) => {
  try {
    await connectToMongoDB();
    const params = await props.params;
    const { recordId } = params;
    const rally = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);
    const entryIndex = parseInt(searchParams.get("ei") || "0", 10);

    const entries = await updateRallyController({
      params: { recordId, setIndex, entryIndex },
      data: rally,
    });
    return NextResponse.json(entries, { status: 200 });
  } catch (error) {
    console.log("[PUT /api/records/sets/rallies]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
