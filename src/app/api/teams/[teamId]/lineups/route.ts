import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { updateTeamLineupsController } from "@/interface/controllers/team/update-team-lineups.controller";
import { withAuth } from "@/lib/api/wrappers";
import { UpdateLineupsSchema } from "@/lib/validations/team";
import { PlayerRole } from "@/entities/player";

export const PATCH = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { teamId } = await props.params;
    await connectToMongoDB();

    const authorizationService = container.get<IAuthorizationService>(
      TYPES.AuthorizationService,
    );
    await authorizationService.verifyTeamRole(teamId, userId, PlayerRole.MEMBER);

    const lineups = UpdateLineupsSchema.parse(await req.json());
    const savedLineups = await updateTeamLineupsController(teamId, lineups);

    return NextResponse.json(savedLineups, { status: 200 });
  })(_req);
