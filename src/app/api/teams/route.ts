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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    // Get or create user profile
    let profile = await Profile.findOne({ userId: session.user.id });
    if (!profile) {
      profile = await Profile.create({
        userId: session.user.id,
        teams: {
          joined: [],
          inviting: [],
        },
      });
    }

    const newMember = new Member({
      name: session.user.name,
      number: 1,
    });

    const { name, nickname } = await request.json();
    // TODO: Add validation for name and nickname
    // if there is a team with the same name, ask the user to choose another name or join the existing team
    // see issue #6
    const newTeam = new Team({
      name,
      nickname,
      members: [
        {
          _id: newMember._id,
          email: session.user.email,
          role: 1, // TODO: Role.OWNER (import { Role } from "@/entities/team")
          user_id: session.user.id,
        },
      ],
      lineups: new Array(3).fill({
        options: {
          liberoReplaceMode: 0,
          liberoReplacePosition: "",
        },
        starting: new Array(6).fill({ _id: null }),
        liberos: [],
        substitutes: [],
      }),
    });

    newMember.team_id = newTeam._id as any;
    (profile.teams.joined as any).unshift(newTeam._id.toString());

    await newMember.save();
    await newTeam.save();
    await profile.save();

    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    console.error("[POST /api/teams]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
