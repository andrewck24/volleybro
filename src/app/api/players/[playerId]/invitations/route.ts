import * as invitationController from "@/interface/controllers/player/invitation.controller";
import { PatchInvitationSchema } from "@/interface/validations/player";
import { assertObjectId } from "@/lib/api/guards";
import { withAuth } from "@/lib/api/wrappers";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/players/{playerId}/invitations - Accept, reject, or leave
 */

export const PATCH = (
  _req: NextRequest,
  props: { params: Promise<{ playerId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { playerId } = await props.params;
    assertObjectId(playerId, "playerId");

    const body = await req.json();
    const { action } = PatchInvitationSchema.parse(body);

    switch (action) {
      case "accept": {
        await invitationController.acceptInvitation({ playerId, userId });
        return NextResponse.json(
          { success: true, message: "Invitation accepted" },
          { status: 200 },
        );
      }

      case "reject": {
        await invitationController.rejectInvitation({ playerId, userId });
        return NextResponse.json(
          { success: true, message: "Invitation rejected" },
          { status: 200 },
        );
      }

      case "leave": {
        await invitationController.leaveTeam({ playerId, userId });
        return NextResponse.json(
          { success: true, message: "Left team successfully" },
          { status: 200 },
        );
      }
    }
  })(_req);
