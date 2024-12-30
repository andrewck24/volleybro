import { NextRequest, NextResponse } from "next/server";
import { createSubstitutionController } from "@/interface/controllers/record/create-substitution.controller";

export const POST = async (
  req: NextRequest,
  props: { params: Promise<{ recordId: string }> }
) => {
  const params = await props.params;
  const { recordId } = params;
  try {
    const substitution = await req.json();
    const searchParams = req.nextUrl.searchParams;
    const setIndex = parseInt(searchParams.get("si") || "0", 10);
    const rallyIndex = parseInt(searchParams.get("ri") || "0", 10);

    const rallies = await createSubstitutionController({
      params: { recordId, setIndex, rallyIndex },
      data: substitution,
    });
    return NextResponse.json(rallies, { status: 200 });
  } catch (error) {
    console.log("[POST /api/records/sets/substitutions]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
