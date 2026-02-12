/**
 * POST /api/teams/{teamId}/ownership - Transfer team ownership
 */

import * as ownershipController from "@/interface/controllers/player/ownership.controller";
import { auth } from "@/lib/auth";
import {
  PlayerSchema,
  TransferOwnershipSchema,
} from "@/lib/validations/player";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { teamId } = await params;

    const body = await req.json();
    const { newOwnerId } = TransferOwnershipSchema.parse(body);

    const updatedPlayer = await ownershipController.transferOwnership(
      teamId,
      newOwnerId,
      userId,
    );

    const validatedPlayer = PlayerSchema.parse(updatedPlayer);
    return NextResponse.json(validatedPlayer, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes("Only current owner") ||
        error.message.includes("not authorized")
      ) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
