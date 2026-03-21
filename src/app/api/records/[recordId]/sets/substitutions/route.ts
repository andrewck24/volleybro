import { NextRequest, NextResponse } from "next/server";
import { createSubstitutionController } from "@/interface/controllers/record/substitution.controller";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { withErrorHandler } from "@/lib/api/wrappers";

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ recordId: string }> },
) =>
  withErrorHandler(async (req) => {
    await connectToMongoDB();
    const { recordId } = await props.params;
    const substitution = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);
    const entryIndex = parseInt(searchParams.get("ei") || "0", 10);

    const entries = await createSubstitutionController({
      params: { recordId, setIndex, entryIndex },
      data: substitution,
    });
    return NextResponse.json(entries, { status: 200 });
  })(_req);
