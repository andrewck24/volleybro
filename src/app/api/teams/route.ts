import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Profile from "@/infrastructure/db/mongoose/schemas/profile";
import Team from "@/infrastructure/db/mongoose/schemas/team";
import { PlayerModel } from "@/infrastructure/db/mongoose/schemas/player";

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

    const { name, nickname } = await request.json();
    // TODO: Add validation for name and nickname
    // if there is a team with the same name, ask the user to choose another name or join the existing team
    // see issue #6
    const newTeam = new Team({
      name,
      nickname,
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

    // Create initial owner player using unified Player entity
    const ownerPlayer = new PlayerModel({
      name: session.user.name,
      email: session.user.email,
      number: 1,
      role: 'OWNER',
      teamId: newTeam._id,
      userId: session.user.id,
    });

    (profile.teams.joined as any).unshift(newTeam._id.toString());

    await ownerPlayer.save();
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
