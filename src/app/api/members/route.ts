import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Profile from "@/infrastructure/db/mongoose/schemas/profile";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import Member from "@/infrastructure/db/mongoose/schemas/member";

export const POST = async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      console.error("[POST /api/members] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    // Get user profile
    const profile = await Profile.findOne({ userId: session.user.id });
    if (!profile) {
      console.error("[POST /api/members] Profile not found");
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const formData = await request.json();

    // Find the team
    const team = await Team.findById(formData.team_id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const members = await Member.find({ team_id: formData.team_id });

    // Any member can create members
    const userIndex = team.members.findIndex(
      (m) => m?.user_id?.toString() === session.user.id
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
    // Only admins can create admins
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
      const hasSameEmail = team.members.some(
        (m) => m.email === formData.email
      );
      if (hasSameEmail) {
        return NextResponse.json(
          { error: "A member with the same email already exists" },
          { status: 409 }
        );
      }

      // Find target user and add team to their inviting list
      const targetProfile = await Profile.findOne({
        "teams.joined": formData.team_id,
      });
      // If profile not found by joined, try to find by email lookup
      // TODO: Implement email lookup via User collection
      if (targetProfile) {
        targetProfile.teams.inviting.push(formData.team_id);
        await targetProfile.save();
      }
    }

    const newMember = new Member({
      team_id: formData.team_id,
      name: formData.name,
      number: formData.number,
    });

    team.members.push({
      _id: newMember._id as any,
      email: formData.email,
      role: formData.admin,
      user_id: undefined as any,
    });
    await team.save();
    await newMember.save();

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
