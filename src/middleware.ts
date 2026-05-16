import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/login", "/signup", "/unauthorized"];
const FORCE_CHANGE_ALLOWED = ["/change-password"];

const ROLE_ROUTES: Record<string, Role[]> = {
  "/admin": ["ADMIN"],
  "/hr": ["ADMIN", "HR_OFFICER"],
  "/payroll": ["ADMIN", "PAYROLL_OFFICER"],
  "/employee": ["ADMIN", "HR_OFFICER", "PAYROLL_OFFICER", "EMPLOYEE"],
};

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;

  if (path === "/" || PUBLIC_ROUTES.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", nextUrl);
    if (path !== "/") url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // Force first-time password change. While the flag is on, only the
  // change-password page is reachable.
  if (
    session.user.mustChangePassword &&
    !FORCE_CHANGE_ALLOWED.some((p) => path.startsWith(p))
  ) {
    return NextResponse.redirect(new URL("/change-password", nextUrl));
  }

  const matched = Object.keys(ROLE_ROUTES).find((p) => path.startsWith(p));
  if (matched && !ROLE_ROUTES[matched].includes(session.user.role)) {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};
