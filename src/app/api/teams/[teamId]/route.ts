import { NextRequest, NextResponse } from "next/server";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { withAuth, withErrorHandler } from "@/lib/api/wrappers";
import {
  NotFoundError,
  AuthorizationError,
} from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { AuthReason } from "@/entities/errors/reasons/auth";

export const GET = (
  req: NextRequest,
  props: { params: Promise<{ teamId: string }> },
) =>
  withErrorHandler(async (req) => {
    const { teamId } = await props.params;
    await connectToMongoDB();

    const team = await Team.findById(teamId);
    if (!team) {
      throw new NotFoundError(
        CommonReason.RESOURCE_NOT_FOUND,
        "Team not found",
      );
    }

    return NextResponse.json(team, { status: 200 });
  })(req);

export const PATCH = (
  req: NextRequest,
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

    const playerRepository = container.get<IPlayerRepository>(
      TYPES.PlayerRepository,
    );
    const player = await playerRepository.findByTeamIdAndUserId(
      teamId,
      userId,
    );
    if (!player) {
      throw new AuthorizationError(
        AuthReason.NOT_TEAM_MEMBER,
        "You are not a member of this team",
      );
    }

    const isAdmin = player.role === "ADMIN" || player.role === "OWNER";
    if (!isAdmin) {
      throw new AuthorizationError(
        AuthReason.INSUFFICIENT_ROLE,
        "You are not authorized to update this team",
      );
    }

    const { name, nickname } = await req.json();
    if (name) team.name = name;
    if (nickname) team.nickname = nickname;

    await team.save();

    return NextResponse.json(team, { status: 200 });
  })(req);
