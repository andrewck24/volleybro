import * as ownershipController from "@/interface/controllers/player/ownership.controller";
import { withAuth } from "@/lib/api/wrappers";
import {
  PlayerSchema,
  TransferOwnershipSchema,
} from "@/lib/validations/player";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/teams/{teamId}/ownership - Transfer team ownership
 */

export const POST = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { teamId } = await props.params;

    const body = await req.json();
    const { newOwnerId } = TransferOwnershipSchema.parse(body);

    const updatedPlayer = await ownershipController.transferOwnership({
      teamId,
      newOwnerId,
      userId,
    });

    const validatedPlayer = PlayerSchema.parse(updatedPlayer);
    return NextResponse.json(validatedPlayer, { status: 200 });
  })(_req);
