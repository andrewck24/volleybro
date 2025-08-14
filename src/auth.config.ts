import type { NextAuthConfig, DefaultSession } from "next-auth";
import type { User as UserEntity } from "@/entities/user";
import Google from "next-auth/providers/google";

// For more information on the module augmentation, see: https://authjs.dev/getting-started/typescript
declare module "next-auth" {
  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User {
    id?: string;
    name?: UserEntity["name"];
    email?: UserEntity["email"];
    image?: UserEntity["image"];
    teams?: UserEntity["teams"];
  }
  /**
   * The shape of the account object returned in the OAuth providers' `account` callback,
   * Usually contains information about the provider being used, like OAuth tokens (`access_token`, etc).
   */
  // interface Account {}

  /**
   * Returned by `useSession`, `auth`, contains information about the active session.
   */
  interface Session {
    user: {
      id: string;
      name?: User["name"];
      email?: User["email"];
      image?: User["image"];
      teams?: User["teams"];
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    id: string;
    name?: UserEntity["name"];
    email?: UserEntity["email"];
    image?: UserEntity["image"];
    teams?: UserEntity["teams"];
  }
}

// For more information on the configuration, see: https://authjs.dev/guides/edge-compatibility#split-config
const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    async jwt({ token, user, session, trigger }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.teams = user.teams ? {
          joined: user.teams.joined?.map(id => id.toString()) || [],
          inviting: user.teams.inviting?.map(id => id.toString()) || []
        } : { joined: [], inviting: [] };
      }
      if (trigger === "update") {
        return { ...token, user: session?.user };
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.name = token.name;
      session.user.email = token.email;
      session.user.image = token.image;
      session.user.teams = token.teams || { joined: [], inviting: [] };
      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
    newUser: "/user/invitations",
  },
} satisfies NextAuthConfig;

export default authConfig;
