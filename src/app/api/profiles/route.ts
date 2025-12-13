import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";
import Profile from "@/infrastructure/db/mongoose/schemas/profile";

export const dynamic = "force-dynamic";

// GET: 取得當前用戶的 profile（若不存在則自動建立）
export const GET = async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    let profile = await Profile.findOne({ userId: session.user.id });

    // 若 profile 不存在，自動建立
    if (!profile) {
      profile = await Profile.create({
        userId: session.user.id,
        teams: {
          joined: [],
          inviting: [],
        },
      });
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
        { status: 400 }
      );
    }

    await connectToMongoDB();

    const profile = await Profile.findOneAndUpdate(
      { userId: session.user.id },
      { $set: body },
      { new: true, upsert: true }
    );

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
