import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/server/auth.config";

const { auth } = NextAuth(authConfig);

/** Path prefixes that make up the protected (dashboard) route group. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/candidates",
  "/applications",
  "/interviews",
  "/clients",
  "/reports",
  "/settings",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
