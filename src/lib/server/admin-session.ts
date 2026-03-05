import { DecodedIdToken } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/constants";
import { getAdminAuth } from "@/lib/server/firebase-admin";

export type AdminSession = {
  uid: string;
  email: string | null;
  name: string | null;
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
const MAX_SIGNIN_AGE_MS = 10 * 60 * 1000;

const parseAdminAllowlist = (): Set<string> => {
  const raw = process.env.ADMIN_ALLOWLIST_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
};

const hasAdminAccess = (token: DecodedIdToken): boolean => {
  const directAdmin = token.admin === true || token.role === "admin";
  if (directAdmin) return true;

  const roles = token.roles;
  if (Array.isArray(roles) && roles.includes("admin")) return true;

  const email = (token.email || "").toLowerCase().trim();
  if (!email) return false;
  const allowlist = parseAdminAllowlist();
  return allowlist.has(email);
};

const toSession = (token: DecodedIdToken): AdminSession => {
  return {
    uid: token.uid,
    email: token.email || null,
    name: typeof token.name === "string" ? token.name : null,
  };
};

export async function createAdminSessionCookie(idToken: string): Promise<{
  cookie: string;
  maxAgeSeconds: number;
  session: AdminSession;
}> {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(idToken, true);
  if (!hasAdminAccess(decoded)) {
    throw new Error("ADMIN_ACCESS_REQUIRED");
  }

  const authTimeMs = Number(decoded.auth_time || 0) * 1000;
  if (authTimeMs <= 0 || Date.now() - authTimeMs > MAX_SIGNIN_AGE_MS) {
    throw new Error("RECENT_LOGIN_REQUIRED");
  }

  const cookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  return {
    cookie,
    maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
    session: toSession(decoded),
  };
}

export async function verifyAdminSessionCookie(
  sessionCookie: string
): Promise<AdminSession | null> {
  if (!sessionCookie) return null;
  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!hasAdminAccess(decoded)) return null;
    return toSession(decoded);
  } catch {
    return null;
  }
}

export async function getAdminSessionFromRequest(
  request: NextRequest
): Promise<AdminSession | null> {
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!sessionCookie) return null;
  return await verifyAdminSessionCookie(sessionCookie);
}

export const adminCookieOptions = (maxAgeSeconds: number) => {
  return {
    name: ADMIN_SESSION_COOKIE,
    maxAge: maxAgeSeconds,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
};
