import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import User from "@/infrastructure/db/mongoose/schemas/user";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import Member from "@/infrastructure/db/mongoose/schemas/member";

export const PATCH = async (
  req: NextRequest,
  props: { params: Promise<{ memberId: string }> }
) => {
  try {
    const params = await props.params;
    const { memberId } = params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.json();

    const updatingMember = await Member.findById(memberId);
    if (!updatingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const team = await Team.findById(updatingMember.team_id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const members = await Member.find({ team_id: updatingMember.team_id });

    // only members can edit members
    const userIsMember = team.members.some(
      (m) => m?.user_id?.toString() === user._id.toString()
    );
    if (!userIsMember) {
      return NextResponse.json(
        { error: "The user is not authorized to edit members in this team" },
        { status: 403 }
      );
    }

    updatingMember.name = formData.name;

    const isNumberChanged = updatingMember.number !== formData.number;
    if (isNumberChanged) {
      const hasSameNumber = members.find(
        (member) => member.number === formData.number
      );
      if (hasSameNumber) {
        return NextResponse.json(
          { error: "A member with the same number already exists" },
          { status: 409 }
        );
      }
      updatingMember.number = formData.number;
    }

    await updatingMember.save();

    return NextResponse.json(updatingMember, { status: 200 });
  } catch (error) {
    console.log("[put-teams]", error);
    return NextResponse.json({ error }, { status: 500 });
  }
};
