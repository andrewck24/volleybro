import { BusinessRuleError } from "@/applications/usecases/user/profile.usecase";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import {
  createProfileController,
  getProfileController,
  updateProfileController,
  ValidationError,
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

    await connectToMongoDB();

    const profile = await updateProfileController({
      userId: session.user.id,
      updates: body,
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Error updating profile:", error);

    // 處理 Controller Layer 驗證錯誤（格式與型別）
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.details },
        { status: 400 },
      );
    }

    // 處理 Use Case Layer 業務規則錯誤
    if (error instanceof BusinessRuleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 其他未預期的錯誤
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
