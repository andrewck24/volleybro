import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { NotFoundError, CommonReason } from "@/entities/errors";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { getTeamController } from "@/interface/controllers/team/get-team.controller";
import { updateTeamController } from "@/interface/controllers/team/update-team.controller";
import { assertObjectId } from "@/lib/api/guards";
import { withAuth, withErrorHandler } from "@/lib/api/wrappers";
import { TeamUpdateSchema } from "@/lib/validations/team";
import { NextRequest, NextResponse } from "next/server";

export const GET = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withErrorHandler(async (_req) => {
    const { teamId } = await props.params;
    assertObjectId(teamId, "teamId");
    await connectToMongoDB();

    const team = await getTeamController(teamId);
    if (!team) {
      throw new NotFoundError(
        CommonReason.RESOURCE_NOT_FOUND,
        "Team not found",
      );
    }

    return NextResponse.json(team, { status: 200 });
  })(_req);

export const PATCH = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withAuth(async (req, { userId }) => {
    const { teamId } = await props.params;
    assertObjectId(teamId, "teamId");
    await connectToMongoDB();

    const authorizationService = container.get<IAuthorizationService>(
      TYPES.AuthorizationService,
    );
    await authorizationService.verifyIsTeamAdmin(teamId, userId);

    const { name, nickname } = TeamUpdateSchema.parse(await req.json());
    const team = await updateTeamController(teamId, { name, nickname });

    return NextResponse.json(team, { status: 200 });
  })(_req);
