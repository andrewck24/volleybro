import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import { getUserController } from "@/interface/controllers/user/user.controller";
import type { AppErrorCode } from "@/applications/errors/app-error";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// TODO: extract to shared utility when refactoring other routes
const ERROR_STATUS: Record<AppErrorCode, number> = {
  VALIDATION: 400,
  AUTHORIZATION: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TRANSIENT: 503,
};

export const GET = async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actorId = session.user.id;
    const { searchParams } = request.nextUrl;
    const email = searchParams.get("email");

    await connectToMongoDB();

    const result = await getUserController(actorId, email);
    if (result.ok === false) {
      const status = ERROR_STATUS[result.error.code] ?? 500;
      return NextResponse.json({ error: result.error.message }, { status });
    }

    return NextResponse.json(result.value, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
};
