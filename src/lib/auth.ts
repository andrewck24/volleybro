import { handleUserCreated } from "@/lib/auth-hook";
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
          await handleUserCreated({ id: user.id, email: user.email });
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
