import * as ownershipController from "@/interface/controllers/player/ownership.controller";
import { assertObjectId } from "@/lib/api/guards";
import { withAuth } from "@/lib/api/wrappers";
import { TransferOwnershipSchema } from "@/interface/validations/player";
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
    assertObjectId(teamId, "teamId");

    const body = await req.json();
    const { newOwnerId } = TransferOwnershipSchema.parse(body);

    const team = await ownershipController.transferOwnership({
      teamId,
      newOwnerId,
      userId,
    });

    return NextResponse.json(team, { status: 200 });
  })(_req);
