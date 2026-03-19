import { withAuth } from "@/lib/api/wrappers";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { getUserController } from "@/interface/controllers/user/user.controller";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email");

  await connectToMongoDB();

  const result = await getUserController(userId, email);
  if (result.ok === false) {
    throw result.error;
  }

  return NextResponse.json(result.value, { status: 200 });
});
