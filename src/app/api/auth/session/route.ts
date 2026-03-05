import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieOptions,
  createAdminSessionCookie,
} from "@/lib/server/admin-session";

const readBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
};

export async function POST(request: NextRequest) {
  const bearerToken = readBearerToken(request);
  let idToken = bearerToken;

  if (!idToken) {
    const body = (await request.json().catch(() => null)) as
      | { idToken?: string }
      | null;
    idToken = body?.idToken?.trim() || null;
  }

  if (!idToken) {
    return NextResponse.json(
      { error: "ID_TOKEN_REQUIRED" },
      { status: 400 }
    );
  }

  try {
    const { cookie, maxAgeSeconds, session } = await createAdminSessionCookie(
      idToken
    );
    const response = NextResponse.json({ success: true, session });
    response.cookies.set({
      ...adminCookieOptions(maxAgeSeconds),
      value: cookie,
    });
    return response;
  } catch (error) {
    const message = String(error);
    const status =
      message.includes("ADMIN_ACCESS_REQUIRED") ||
      message.includes("RECENT_LOGIN_REQUIRED")
        ? 403
        : 401;
    const code = message.includes("RECENT_LOGIN_REQUIRED")
      ? "RECENT_LOGIN_REQUIRED"
      : message.includes("ADMIN_ACCESS_REQUIRED")
        ? "ADMIN_ACCESS_REQUIRED"
        : "AUTH_FAILED";
    return NextResponse.json({ error: code }, { status });
  }
}
