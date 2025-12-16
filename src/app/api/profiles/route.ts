import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import {
  getProfileController,
  createProfileController,
  updateProfileController,
} from "@/interface/controllers/user/profile.controller";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// GET: 取得當前用戶的 profile
// 注意：保留自動建立邏輯作為 fallback（防止 Hook 失敗情況）
export const GET = async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    // 透過 Controller 取得 Profile（遵循 Clean Architecture）
    let profile = await getProfileController({
      userId: session.user.id,
    });

    // Fallback：若 profile 不存在（Hook 失敗時），透過 Controller 建立
    if (!profile) {
      console.warn(
        `[GET /api/profiles] Fallback: creating profile for user ${session.user.id}`,
      );

      const createdProfile = await createProfileController({
        userId: session.user.id,
      });

      if (!createdProfile) {
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 },
        );
      }

      profile = createdProfile;
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};

// PATCH: 更新當前用戶的 profile
export const PATCH = async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // 不允許更新 userId
    if (body.userId) {
      return NextResponse.json(
        { error: "Cannot update userId" },
        { status: 400 },
      );
    }

    await connectToMongoDB();

    const profile = await updateProfileController({
      userId: session.user.id,
      updates: body,
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
