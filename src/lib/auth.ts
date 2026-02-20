import { createProfileController } from "@/interface/controllers/user/profile.controller";
import client from "@/lib/data/mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  user: {
    modelName: "users",
  },
  session: {
    modelName: "sessions",
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  account: {
    modelName: "accounts",
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          console.log(`[Better Auth Hook] User created: ${user.id}`);

          const profile = await createProfileController({
            userId: user.id,
          });

          if (profile) {
            console.log(
              `[Better Auth Hook] Profile created for user ${user.id}`,
            );
          } else {
            console.error(
              `[Better Auth Hook] Failed to create profile for user ${user.id}`,
            );
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
