import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin-api";
import { getAdminDb } from "@/lib/server/firebase-admin";

type Params = {
  params: Promise<{ uid: string }>;
};

type BillingPlan = "free" | "monthly" | "semiannual" | "yearly" | "lifetime";

type RequestBody = {
  plan?: BillingPlan;
  note?: unknown;
};

const addMonths = (base: Date, months: number): Date => {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
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
  if (
    plan !== "free" &&
    plan !== "monthly" &&
    plan !== "semiannual" &&
    plan !== "yearly" &&
    plan !== "lifetime"
  ) {
    return NextResponse.json(
      { error: "INVALID_PLAN", message: "plan must be free, monthly, semiannual, yearly, or lifetime" },
      { status: 400 }
    );
  }

  if (body?.note !== undefined && typeof body.note !== "string") {
    return NextResponse.json(
      { error: "INVALID_NOTE", message: "note must be a string when provided" },
      { status: 400 }
    );
  }

  const note = (body?.note ?? "").trim().slice(0, 400);
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
      update.expiresAt = FieldValue.delete();
    } else if (plan === "monthly" || plan === "semiannual" || plan === "yearly") {
      const now = new Date();
      const months = plan === "monthly" ? 1 : plan === "semiannual" ? 6 : 12;
      update.activatedAt = Timestamp.fromDate(now);
      update.expiresAt = Timestamp.fromDate(addMonths(now, months));
    } else {
      update.activatedAt = FieldValue.delete();
      update.expiresAt = FieldValue.delete();
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
    console.error("FAILED_TO_UPDATE_BILLING", { uid, plan, error });
    return NextResponse.json(
      { error: "FAILED_TO_UPDATE_BILLING" },
      { status: 500 }
    );
  }
}
