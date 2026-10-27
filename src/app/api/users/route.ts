import {
  getUserByIdController,
  searchUserController,
} from "@/interface/controllers/user/user.controller";
import { assertObjectId } from "@/lib/api/guards";
import { withAuth } from "@/lib/api/wrappers";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email");

  const teamId = searchParams.get("teamId") ?? "";
  if (email) assertObjectId(teamId, "teamId");

  const result = email
    ? await searchUserController({ email, teamId, userId })
    : await getUserByIdController({ userId });
  if (result.ok === false) {
    throw result.error;
  }

  return NextResponse.json(result.value, { status: 200 });
});
