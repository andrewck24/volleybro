import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Profile from "@/infrastructure/db/mongoose/schemas/profile";
import User from "@/infrastructure/db/mongoose/schemas/user";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import Member from "@/infrastructure/db/mongoose/schemas/member";

export const GET = async (
  _req: NextRequest,
  props: { params: Promise<{ teamId: string }> }
) => {
  try {
    await connectToMongoDB();
    const params = await props.params;
    const { teamId } = params;
    const members = await Member.find({ team_id: teamId });
    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error("[GET /api/teams/:teamId/members]", error);
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
    const profile = await Profile.findOne({ userId: session.user.id });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
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
        const leavingProfile = await Profile.findOne({
          userId: member.user_id.toString(),
        });
        if (leavingProfile) {
          leavingProfile.teams.joined = (
            leavingProfile.teams.joined as any
          ).filter((t: any) => t.toString() !== teamId);
          await leavingProfile.save();
        }
        team.members[memberIndex].user_id = null;
        team.members[memberIndex].email = "";
      } else if (member?.email) {
        // Remove from inviting list if user exists
        const leavingUser = await User.findOne({ email: member.email });
        if (leavingUser) {
          await Profile.findOneAndUpdate(
            { userId: leavingUser._id.toString() },
            { $pull: { "teams.inviting": teamId } }
          );
        }
        team.members[memberIndex].email = "";
      }

      if (formData.email) {
        // Add to inviting list if user exists
        const invitingUser = await User.findOne({ email: formData.email });
        if (invitingUser) {
          await Profile.findOneAndUpdate(
            { userId: invitingUser._id.toString() },
            { $addToSet: { "teams.inviting": teamId } },
            { upsert: true }
          );
        }
        team.members[memberIndex].email = formData.email;
      }
    } else if (action === "access") {
      team.members[memberIndex].role = formData.role;
    }

    await team.save();
    return NextResponse.json(team.members, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/teams/:teamId/members]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
