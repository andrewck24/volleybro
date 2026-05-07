import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { withAuth, withErrorHandler } from "@/lib/api/wrappers";
import { NotFoundError, ValidationError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function assertValidObjectId(id: string): void {
  if (!OBJECT_ID_RE.test(id)) {
    throw new ValidationError(CommonReason.INVALID_INPUT, "Invalid team ID format");
  }
}

export const GET = (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withErrorHandler(async (_req) => {
    const { teamId } = await props.params;
    assertValidObjectId(teamId);
    await connectToMongoDB();

    const team = await Team.findById(teamId);
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
    assertValidObjectId(teamId);
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
    await authorizationService.verifyIsTeamAdmin(teamId, userId);

    const { name, nickname } = await req.json();
    if (name) team.name = name;
    if (nickname) team.nickname = nickname;

    await team.save();

    return NextResponse.json(team, { status: 200 });
  })(_req);
