import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin-api";
import { getAdminAuth, getAdminDb } from "@/lib/server/firebase-admin";

type Params = {
  params: Promise<{ uid: string }>;
};

type RequestBody = {
  disabled?: boolean;
};

export async function PATCH(request: NextRequest, context: Params) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const { uid: rawUid } = await context.params;
  const uid = rawUid.trim();
  if (!uid) {
    return NextResponse.json({ error: "UID_REQUIRED" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  if (typeof body?.disabled !== "boolean") {
    return NextResponse.json(
      { error: "INVALID_DISABLED_FLAG" },
      { status: 400 }
    );
  }

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    await adminAuth.updateUser(uid, { disabled: body.disabled });
    await adminDb.collection("adminAuditLogs").add({
      action: "user_status_update",
      uid,
      disabled: body.disabled,
      actorUid: session.uid,
      actorEmail: session.email,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      uid,
      disabled: body.disabled,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "FAILED_TO_UPDATE_USER_STATUS", message: String(error) },
      { status: 500 }
    );
  }
}
