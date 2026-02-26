import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { createTeamController } from "@/interface/controllers/team/team.controller";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const CreateTeamSchema = z.object({
  name: z.string().min(1),
  nickname: z.string().optional(),
});

export const POST = async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, nickname } = CreateTeamSchema.parse(body);

    await connectToMongoDB();

    const team = await createTeamController(
      { name, nickname },
      session.user.id,
      session.user.name,
    );

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/teams]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
