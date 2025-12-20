import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";

export const PATCH = async (
  req: NextRequest,
  props: { params: Promise<{ teamId: string }> }
) => {
  try {
    const params = await props.params;
    const { teamId } = params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    const team = await Team.findById(teamId);
    if (!team) {
      console.error("[PATCH /api/teams/[teamId]/lineups] Team not found");
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if user is a member of the team using PlayerRepository
    const playerRepository = container.get<IPlayerRepository>(
      TYPES.PlayerRepository
    );
    const player = await playerRepository.findByTeamIdAndUserId(
      teamId,
      session.user.id
    );
    if (!player) {
      return NextResponse.json(
        { error: "You are not authorized to update this team" },
        { status: 401 }
      );
    }

    const lineups = await req.json();
    team.lineups = lineups;

    await team.save();

    return NextResponse.json(team.lineups, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/teams/:teamId/lineups]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
