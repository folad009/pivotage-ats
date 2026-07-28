import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/server/auth.config";

const { auth } = NextAuth(authConfig);

/** Path prefixes that make up the protected staff (dashboard) route group. */
const STAFF_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/candidates",
  "/applications",
  "/interviews",
  "/clients",
  "/reports",
  "/settings",
];

const CANDIDATE_PREFIXES = ["/my-applications"];

const PUBLIC_PREFIXES = ["/careers", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const accountType = session?.user?.accountType;

  const isStaffRoute = STAFF_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isCandidateRoute = CANDIDATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isPublicRoute =
    pathname === "/login" ||
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  if (isStaffRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (accountType === "candidate") {
      return NextResponse.redirect(new URL("/careers", req.nextUrl.origin));
    }
  }

  if (isCandidateRoute) {
    if (!isLoggedIn || accountType !== "candidate") {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === "/login" && isLoggedIn) {
    const destination =
      accountType === "candidate" ? "/careers" : "/dashboard";
    return NextResponse.redirect(new URL(destination, req.nextUrl.origin));
  }

  if (pathname === "/register" && isLoggedIn && accountType === "candidate") {
    return NextResponse.redirect(new URL("/careers", req.nextUrl.origin));
  }

  if (pathname === "/" && isLoggedIn) {
    const destination =
      accountType === "candidate" ? "/careers" : "/dashboard";
    return NextResponse.redirect(new URL(destination, req.nextUrl.origin));
  }

  if (!isPublicRoute && !isStaffRoute && !isCandidateRoute && pathname !== "/") {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
