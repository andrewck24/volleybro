import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import User from "@/infrastructure/db/mongoose/schemas/user";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import Member from "@/infrastructure/db/mongoose/schemas/member";
import { ObjectId } from "mongodb";

export const GET = async (
  req: NextRequest,
  props: { params: Promise<{ teamId: string }> }
) => {
  try {
    await connectToMongoDB();
    const params = await props.params;
    const { teamId } = params;
    const members = await Member.find({ team_id: teamId });
    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.log("[get-team-members]", error);
    return NextResponse.json({ error }, { status: 500 });
  }
};

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
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const { members } = team;

    const searchParams = req.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const action = searchParams.get("action");
    const formData = await req.json();

    const memberIndex = members.findIndex((m) => m._id.toString() === memberId);
    if (memberIndex === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const member = members[memberIndex];

    if (action === "invite") {
      if (member?.email === formData.email) {
        return NextResponse.json(team.members, { status: 200 });
      }

      if (member?.user_id) {
        const leavingUser = await User.findById(member.user_id);
        if (leavingUser) {
          leavingUser.teams.joined = leavingUser.teams.joined.filter(
            (t) => t.toString() !== teamId
          );
          await leavingUser.save();
        }
        team.members[memberIndex].user_id = null;
        team.members[memberIndex].email = "";
      } else if (member?.email) {
        const leavingUser = await User.findOne({ email: member.email });
        if (leavingUser) {
          leavingUser.teams.inviting = leavingUser.teams.inviting.filter(
            (t) => t.toString() !== teamId
          );
          await leavingUser.save();
        }
        team.members[memberIndex].email = "";
      }

      if (formData.email) {
        const invitingUser = await User.findOne({ email: formData.email });
        if (invitingUser) {
          invitingUser.teams.inviting.push(new ObjectId(teamId));
          await invitingUser.save();
        }
        team.members[memberIndex].email = formData.email;
      }
    } else if (action === "access") {
      team.members[memberIndex].role = formData.role;
    }

    await team.save();
    return NextResponse.json(team.members, { status: 200 });
  } catch (error) {
    console.log("[patch-team-members]", error);
    return NextResponse.json({ error }, { status: 500 });
  }
};
