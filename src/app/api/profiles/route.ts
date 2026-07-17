import { withAuth } from "@/lib/api/wrappers";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import {
  createProfileController,
  getProfileController,
  updateProfileController,
} from "@/interface/controllers/user/profile.controller";
import { NotFoundError, ProfileReason } from "@/entities/errors";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// GET: 取得當前用戶的 profile
// 注意：保留自動建立邏輯作為 fallback（防止 Hook 失敗情況）
export const GET = withAuth(async (_req, { userId }) => {
  await connectToMongoDB();

  let profile = await getProfileController({ userId });

  if (!profile) {
    console.warn(
      `[GET /api/profiles] Fallback: creating profile for user ${userId}`,
    );
    profile = await createProfileController({ userId });
  }

  return NextResponse.json(profile, { status: 200 });
});

// PATCH: 更新當前用戶的 profile
export const PATCH = withAuth(async (request: NextRequest, { userId }) => {
  const body = await request.json();

  await connectToMongoDB();

  const profile = await updateProfileController({ userId, updates: body });

  if (!profile) {
    throw new NotFoundError(
      ProfileReason.PROFILE_NOT_FOUND,
      "Profile not found",
    );
  }

  return NextResponse.json(profile, { status: 200 });
});
