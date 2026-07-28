import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import argon2 from "argon2";

import { db } from "@/server/db";
import { authConfig } from "@/server/auth.config";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (user?.passwordHash && user.isActive) {
          const isValid = await argon2.verify(user.passwordHash, password);
          if (isValid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              accountType: "staff" as const,
            };
          }
        }

        const candidate = await db.candidate.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            passwordHash: true,
            anonymizedAt: true,
          },
        });
        if (candidate?.passwordHash && !candidate.anonymizedAt) {
          const isValid = await argon2.verify(candidate.passwordHash, password);
          if (isValid) {
            return {
              id: candidate.id,
              email: candidate.email,
              name: `${candidate.firstName} ${candidate.lastName}`,
              accountType: "candidate" as const,
            };
          }
        }

        return null;
      },
    }),
  ],
});
