import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Role hierarchy: admin > moderator > usher > user
const ADMIN_ROLES = ["admin", "moderator"];
const ATTENDANCE_ROLES = ["admin", "moderator", "usher"];

export default auth((request) => {
  const { auth: session, nextUrl } = request as any;
  const pathname = nextUrl.pathname;

  const isLoggedIn = !!session;
  const role = session?.user?.role;
  const status = session?.user?.status;

  // Admin routes: admin and moderator only
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Attendance routes: admin, moderator, usher only
  if (pathname.startsWith("/attendance") && pathname !== "/attendance/login") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/attendance/login", request.url));
    }
    if (!ATTENDANCE_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/attendance/login", request.url));
    }
    return NextResponse.next();
  }

  // Protected user routes (requires login)
  if (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/dashboard")
  ) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Redirect logged-in users away from login/register
  if (pathname === "/login" || pathname === "/register") {
    if (isLoggedIn) {
      if (ADMIN_ROLES.includes(role)) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (role === "usher") {
        return NextResponse.redirect(new URL("/attendance", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Pending users can only access /dashboard and /logout
  if (
    isLoggedIn &&
    status === "pending" &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/login") &&
    pathname !== "/"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads|public).*)",
  ],
};
