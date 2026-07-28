import type { Role } from "@/lib/prisma-browser";
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

export type AccountType = "staff" | "candidate";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      accountType: AccountType;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: Role;
    accountType: AccountType;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role?: Role;
    accountType: AccountType;
  }
}
