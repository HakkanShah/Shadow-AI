import { NextRequest, NextResponse } from "next/server";
import {
  AdminSession,
  getAdminSessionFromRequest,
} from "@/lib/server/admin-session";

export async function requireAdmin(
  request: NextRequest
): Promise<AdminSession | NextResponse> {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return session;
}
