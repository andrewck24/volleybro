import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import User from "@/infrastructure/db/mongoose/schemas/user";
import Team from "@/infrastructure/db/mongoose/schemas/team";

export const dynamic = "force-dynamic";

export const GET = async (req) => {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { joined, inviting } = user.teams;

    // find joined teams and inviting teams respectively
    const joinedTeams = await Team.find({ _id: { $in: joined } });
    joinedTeams.sort(
      (a, b) =>
        joined.indexOf(a._id.toString()) - joined.indexOf(b._id.toString())
    );
    const invitingTeams = await Team.find({ _id: { $in: inviting } });
    invitingTeams.sort(
      (a, b) =>
        inviting.indexOf(a._id.toString()) - inviting.indexOf(b._id.toString())
    );

    const teams = {
      joined: joinedTeams,
      inviting: invitingTeams,
    };

    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
};

export const PATCH = async (req) => {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action"); // action = "switch" | "accept" | "reject"
    const teamId = searchParams.get("teamId");

    const team = await Team.findById(teamId);
    if (!team) {
      console.error("[PATCH /api/users/teams] Team not found");
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // switch team or accept/reject invitation
    if (action === "switch") {
      const isJoined = user.teams.joined.find((id) => id.equals(teamId));
      if (!isJoined) {
        return NextResponse.json(
          { error: "You are not a member of this team" },
          { status: 403 }
        );
      }

      const teamIndex = user.teams.joined.findIndex((id) => id.equals(teamId));
      user.teams.joined.unshift(user.teams.joined.splice(teamIndex, 1)[0]);
      await user.save();

      return NextResponse.json(user.teams, { status: 200 });
    } else if (action === "accept" || action === "reject") {
      const isInvited = user.teams.inviting.find((id) => id.equals(teamId));
      if (!isInvited) {
        return NextResponse.json(
          { error: "You are not invited to this team" },
          { status: 403 }
        );
      }

      const team = await Team.findById(teamId);
      if (!team) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
      const memberIndex = team.members.findIndex(
        (m) => m?.email === user.email
      );
      if (memberIndex === -1) {
        return NextResponse.json(
          { error: "You are not invited to this team" },
          { status: 403 }
        );
      }

      if (action === "accept") {
        user.teams.joined.unshift(teamId);
        user.teams.inviting = user.teams.inviting.filter(
          (id) => !id.equals(teamId)
        );
        team.members[memberIndex].user_id = user._id;
      } else {
        user.teams.inviting = user.teams.inviting.filter(
          (id) => !id.equals(teamId)
        );
        team.members[memberIndex].email = "";
      }

      await user.save();
      await team.save();

      return NextResponse.json(user.teams, { status: 200 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
};
