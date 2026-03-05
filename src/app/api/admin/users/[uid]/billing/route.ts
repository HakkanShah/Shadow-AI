import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin-api";
import { getAdminDb } from "@/lib/server/firebase-admin";

type Params = {
  params: Promise<{ uid: string }>;
};

type RequestBody = {
  plan?: "free" | "lifetime";
  note?: string;
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
  const plan = body?.plan;
  if (plan !== "free" && plan !== "lifetime") {
    return NextResponse.json(
      { error: "INVALID_PLAN", message: "plan must be free or lifetime" },
      { status: 400 }
    );
  }

  const note = (body?.note || "").trim().slice(0, 400);
  const adminDb = getAdminDb();
  const billingRef = adminDb.doc(`users/${uid}/billing/state`);

  try {
    const update: Record<string, unknown> = {
      plan,
      source: "admin-manual",
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: {
        uid: session.uid,
        email: session.email,
      },
      note: note || FieldValue.delete(),
    };

    if (plan === "lifetime") {
      update.activatedAt = FieldValue.serverTimestamp();
    } else {
      update.activatedAt = FieldValue.delete();
    }

    await billingRef.set(update, { merge: true });
    await adminDb.collection("adminAuditLogs").add({
      action: "billing_update",
      uid,
      plan,
      note: note || null,
      actorUid: session.uid,
      actorEmail: session.email,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      uid,
      plan,
      note: note || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "FAILED_TO_UPDATE_BILLING", message: String(error) },
      { status: 500 }
    );
  }
}
