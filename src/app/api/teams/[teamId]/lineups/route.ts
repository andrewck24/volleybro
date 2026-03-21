import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { withAuth } from "@/lib/api/wrappers";
import { NotFoundError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { PlayerRole } from "@/entities/player";

export const PATCH = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { teamId } = await props.params;
    await connectToMongoDB();

    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError(
        CommonReason.RESOURCE_NOT_FOUND,
        "Team not found",
      );
    }

    const authorizationService = container.get<IAuthorizationService>(
      TYPES.AuthorizationService,
    );
    await authorizationService.verifyTeamRole(teamId, userId, PlayerRole.MEMBER);

    const lineups = await req.json();
    team.lineups = lineups;

    await team.save();

    return NextResponse.json(team.lineups, { status: 200 });
  })(_req);
