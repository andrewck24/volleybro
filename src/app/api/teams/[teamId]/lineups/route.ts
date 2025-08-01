import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import User from "@/infrastructure/db/mongoose/schemas/user";
import Team from "@/infrastructure/db/mongoose/schemas/team";

export const PATCH = async (
  req: NextRequest,
  props: { params: Promise<{ teamId: string }> }
) => {
  try {
    const params = await props.params;
    const { teamId } = params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      console.error("[PATCH /api/teams/[teamId]/lineups] Team not found");
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember = team.members.find(
      (m) => m?.user_id?.toString() === user._id.toString()
    );
    if (!isMember) {
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
    console.error("[PATCH /api/teams/[teamId]/lineups] Error:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
};
