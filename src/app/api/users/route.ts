import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import {
  getUserByIdController,
  searchUserController,
} from "@/interface/controllers/user/user.controller";
import { withAuth } from "@/lib/api/wrappers";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email");

  await connectToMongoDB();

  const result = email
    ? await searchUserController({ email })
    : await getUserByIdController({ userId });
  if (result.ok === false) {
    throw result.error;
  }

  return NextResponse.json(result.value, { status: 200 });
});
