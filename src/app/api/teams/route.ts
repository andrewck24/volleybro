import { AuthenticationError } from "@/entities/errors/app-error";
import { AuthReason } from "@/entities/errors/reasons/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { createTeamController } from "@/interface/controllers/team/team.controller";
import { withErrorHandler } from "@/lib/api/wrappers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const CreateTeamSchema = z.object({
  name: z.string().min(1),
  nickname: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new AuthenticationError(
      AuthReason.SESSION_REQUIRED,
      "Authentication is required",
    );
  }

  const body = await request.json();
  const { name, nickname } = CreateTeamSchema.parse(body);

  await connectToMongoDB();

  const team = await createTeamController({
    name,
    nickname,
    userId: session.user.id,
    userName: session.user.name,
  });

  return NextResponse.json(team, { status: 201 });
});
