"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Sign out the current user
 * This is a server action that can be called from client components
 */
export const signOut = async () => {
  await auth.api.signOut({ headers: await headers() });
  redirect("/auth/sign-in");
};

/**
 * Sign up with email/password
 * @deprecated Not yet implemented. Currently only Google OAuth is supported.
 * Use authClient.signIn.social({ provider: "google" }) from @/lib/auth-client instead.
 */
export const signUp = async (_provider?: string, _options?: unknown) => {
  return { error: "Email/password sign-up is not yet implemented" };
};
