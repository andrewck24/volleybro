import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Profile from "@/infrastructure/db/mongoose/schemas/profile";
import Team from "@/infrastructure/db/mongoose/schemas/team";

export const dynamic = "force-dynamic";

export const GET = async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    // Get user profile
    const profile = await Profile.findOne({ userId: session.user.id });
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const { joined, inviting } = profile.teams;
    const joinedStr = (joined as any).map((id: any) => id.toString());
    const invitingStr = (inviting as any).map((id: any) => id.toString());

    // Find joined teams and inviting teams respectively
    const joinedTeams = await Team.find({ _id: { $in: joined } });
    joinedTeams.sort(
      (a, b) =>
        joinedStr.indexOf(a._id.toString()) -
        joinedStr.indexOf(b._id.toString())
    );
    const invitingTeams = await Team.find({ _id: { $in: inviting } });
    invitingTeams.sort(
      (a, b) =>
        invitingStr.indexOf(a._id.toString()) -
        invitingStr.indexOf(b._id.toString())
    );

    const teams = {
      joined: joinedTeams,
      inviting: invitingTeams,
    };

    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

export const PATCH = async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    // Get user profile
    const profile = await Profile.findOne({ userId: session.user.id });
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action"); // action = "switch" | "accept" | "reject"
    const teamId = searchParams.get("teamId");

    const team = await Team.findById(teamId);
    if (!team) {
      console.error("[PATCH /api/users/teams] Team not found");
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Switch team or accept/reject invitation
    if (action === "switch") {
      const joinedArr = profile.teams.joined as any;
      const isJoined = joinedArr.some(
        (id: any) => id.toString() === teamId
      );
      if (!isJoined) {
        return NextResponse.json(
          { error: "You are not a member of this team" },
          { status: 403 }
        );
      }
      const teamIndex = joinedArr.findIndex(
        (id: any) => id.toString() === teamId
      );
      if (teamIndex !== -1) {
        joinedArr.unshift(...joinedArr.splice(teamIndex, 1));
      }
      await profile.save();

      return NextResponse.json(profile.teams, { status: 200 });
    } else if (action === "accept" || action === "reject") {
      const invitingArr = profile.teams.inviting as any;
      const isInvited = invitingArr.some(
        (id: any) => id.toString() === teamId
      );
      if (!isInvited) {
        return NextResponse.json(
          { error: "You are not invited to this team" },
          { status: 403 }
        );
      }

      const memberIndex = team.members.findIndex(
        (m) => m?.email === session.user.email
      );
      if (memberIndex === -1) {
        return NextResponse.json(
          { error: "You are not invited to this team" },
          { status: 403 }
        );
      }

      if (action === "accept") {
        (profile.teams.joined as any).unshift(teamId!);
        profile.teams.inviting = invitingArr.filter(
          (id: any) => id.toString() !== teamId
        );
        team.members[memberIndex].user_id = session.user.id as any;
      } else {
        profile.teams.inviting = invitingArr.filter(
          (id: any) => id.toString() !== teamId
        );
        team.members[memberIndex].email = "";
      }

      await profile.save();
      await team.save();

      return NextResponse.json(profile.teams, { status: 200 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
