import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import User from "@/infrastructure/db/mongoose/schemas/user";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import Member from "@/infrastructure/db/mongoose/schemas/member";

export const POST = async (req) => {
  try {
    const session = await auth();
    if (!session) {
      console.error("[POST /api/members] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      console.error("[POST /api/members] User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.json();

    // find the team
    const team = await Team.findById(formData.team_id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const members = await Member.find({ team_id: formData.team_id });

    // any member can create members
    const userIndex = team.members.findIndex(
      (m) => m?.user_id?.toString() === user._id.toString()
    );
    const userIsMember = userIndex !== -1;
    if (!userIsMember) {
      return NextResponse.json(
        {
          error:
            "The user is not authorized to create a new member in this team",
        },
        { status: 403 }
      );
    }
    // only admins can create admins
    const userIsAdmin = !!team.members[userIndex].role;
    if (formData.admin !== "member" && !userIsAdmin) {
      return NextResponse.json(
        {
          error: "The user is not authorized to grant access to other members",
        },
        { status: 403 }
      );
    }

    const hasSameNumber = members.some((m) => m.number === formData.number);
    if (hasSameNumber) {
      return NextResponse.json(
        { error: "A member with the same number already exists" },
        { status: 409 }
      );
    }

    if (formData.email) {
      const hasSameEmail = team.members.some((m) => m.email === formData.email);
      if (hasSameEmail) {
        return NextResponse.json(
          { error: "A member with the same email already exists" },
          { status: 409 }
        );
      }
      const targetUser = await User.findOne({ email: formData.email });
      if (targetUser) {
        targetUser.teams.inviting.push(formData.team_id);
        await targetUser.save();
      }
    }

    const newMember = new Member({
      team_id: formData.team_id,
      name: formData.name,
      number: formData.number,
    });

    team.members.push({
      _id: newMember._id,
      email: formData.email,
      role: formData.admin,
    });
    await team.save();
    await newMember.save();

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
};
