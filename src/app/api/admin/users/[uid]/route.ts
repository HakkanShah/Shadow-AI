import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin-api";
import { getAdminAuth, getAdminDb } from "@/lib/server/firebase-admin";
import { serializeFirestoreValue } from "@/lib/server/firestore-format";
import { AdminUserDetail } from "@/types/admin";

type Params = {
  params: Promise<{ uid: string }>;
};

const toIsoOrNull = (value?: string): string | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

const readRecentCollection = async (
  adminDb: ReturnType<typeof getAdminDb>,
  path: string,
  orderField: string
): Promise<{ id: string; data: Record<string, unknown> }[]> => {
  const ref = adminDb.collection(path);
  try {
    const ordered = await ref.orderBy(orderField, "desc").limit(20).get();
    return ordered.docs.map((doc) => ({
      id: doc.id,
      data: serializeFirestoreValue(doc.data()) as Record<string, unknown>,
    }));
  } catch {
    const fallback = await ref.limit(20).get();
    return fallback.docs.map((doc) => ({
      id: doc.id,
      data: serializeFirestoreValue(doc.data()) as Record<string, unknown>,
    }));
  }
};

export async function GET(request: NextRequest, context: Params) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const { uid: rawUid } = await context.params;
  const uid = rawUid.trim();
  if (!uid) {
    return NextResponse.json({ error: "UID_REQUIRED" }, { status: 400 });
  }

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const user = await adminAuth.getUser(uid);
    const billingRef = adminDb.doc(`users/${uid}/billing/state`);
    const billingSnapshot = await billingRef.get();
    const billingData = billingSnapshot.exists
      ? (serializeFirestoreValue(billingSnapshot.data()) as Record<string, unknown>)
      : null;
    const billingPlan = billingData?.plan === "lifetime" ? "lifetime" : "free";
    const billingActivatedAt =
      typeof billingData?.activatedAt === "string" ? billingData.activatedAt : null;

    const [devices, logins, events] = await Promise.all([
      readRecentCollection(adminDb, `users/${uid}/devices`, "lastSeenAt"),
      readRecentCollection(adminDb, `users/${uid}/loginEvents`, "createdAt"),
      readRecentCollection(adminDb, `users/${uid}/events`, "createdAt"),
    ]);

    const payload: AdminUserDetail = {
      user: {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        providerId: user.providerData[0]?.providerId || null,
        disabled: Boolean(user.disabled),
        emailVerified: Boolean(user.emailVerified),
        lastSignInTime: toIsoOrNull(user.metadata.lastSignInTime),
        createdAt: toIsoOrNull(user.metadata.creationTime),
        billingPlan,
        billingActivatedAt,
      },
      devices,
      logins,
      events,
      billingRaw: billingData,
    };

    return NextResponse.json({
      success: true,
      detail: payload,
      generatedAt: new Date().toISOString(),
      actedBy: session.email || session.uid,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "FAILED_TO_LOAD_USER", message: String(error) },
      { status: 500 }
    );
  }
}
