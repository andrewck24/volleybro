import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import User from "@/infrastructure/db/mongoose/schemas/user";
import Team from "@/infrastructure/db/mongoose/schemas/team";

export const GET = async (
  req: NextRequest,
  props: { params: Promise<{ teamId: string }> }
) => {
  try {
    await connectToMongoDB();
    const params = await props.params;
    const { teamId } = params;

    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error("[GET /api/teams/:teamId]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

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
    const user = await User.findById(session.user.id);
    if (!user) {
      console.error("[PATCH /api/users/teams] User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { name, nickname } = await req.json();
    const team = await Team.findById(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const userIndex = team.members.findIndex(
      (m) => m?.user_id?.toString() === user._id.toString()
    );
    const isMember = userIndex !== -1;
    if (!isMember) {
      return NextResponse.json(
        { error: "You are not authorized to update this team" },
        { status: 401 }
      );
    }
    const isAdmin = !!team.members[userIndex].role;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "You are not authorized to update this team" },
        { status: 401 }
      );
    }

    if (name) team.name = name;
    if (nickname) team.nickname = nickname;

    await team.save();

    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/teams/:teamId]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
