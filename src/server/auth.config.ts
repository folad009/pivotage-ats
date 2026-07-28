import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration shared between the middleware and the full
 * server instance. It MUST NOT import Node-only modules (Prisma, argon2): the
 * middleware runs on the Edge runtime. Providers and the adapter are added in
 * `auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    // Credentials-based sign-in requires the JWT session strategy. The Prisma
    // adapter is still wired up in `auth.ts` for the User/Account models and
    // future OAuth providers (AGENTS.md §10).
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.accountType = user.accountType;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.accountType = token.accountType;
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
