import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import User from "@/infrastructure/db/mongoose/schemas/user";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import type { SearchUserUseCase } from "@/applications/usecases/user/search-user.usecase";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const email = searchParams.get("email");

    await connectToMongoDB();

    if (email) {
      const searchUserUseCase = container.get<SearchUserUseCase>(
        TYPES.SearchUserUseCase
      );
      const result = await searchUserUseCase.execute(email);

      if (result.ok === false) {
        if (result.error.code === "VALIDATION") {
          return NextResponse.json(
            { error: result.error.message },
            { status: 400 }
          );
        }
        if (result.error.code === "NOT_FOUND") {
          return NextResponse.json(
            { error: result.error.message },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { error: result.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(result.value, { status: 200 });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
};
