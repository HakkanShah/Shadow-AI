import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/admin")) return NextResponse.next();
  if (path === "/admin/login") return NextResponse.next();

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (session) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
