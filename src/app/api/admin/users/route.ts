import { UserRecord } from "firebase-admin/auth";
import { DocumentData } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin-api";
import { getAdminAuth, getAdminDb } from "@/lib/server/firebase-admin";
import { serializeFirestoreValue } from "@/lib/server/firestore-format";
import { AdminUserSummary, BillingPlan } from "@/types/admin";

const parseLimit = (raw: string | null): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(200, Math.floor(parsed)));
};

const toIsoOrNull = (value?: string): string | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

const normalizePlan = (raw: unknown): BillingPlan => {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "monthly") return "monthly";
  if (value === "semiannual") return "semiannual";
  if (value === "yearly") return "yearly";
  if (value === "lifetime") return "lifetime";
  return "free";
};

const readBilling = (
  data: DocumentData | undefined
): { plan: BillingPlan; activatedAt: string | null; expiresAt: string | null } => {
  if (!data) return { plan: "free", activatedAt: null, expiresAt: null };
  const normalized = serializeFirestoreValue(data) as Record<string, unknown>;
  const plan = normalizePlan(normalized.plan);
  const activatedAt =
    typeof normalized.activatedAt === "string" ? normalized.activatedAt : null;
  const expiresAt =
    typeof normalized.expiresAt === "string" ? normalized.expiresAt : null;
  return { plan, activatedAt, expiresAt };
};

const mapUser = (
  user: UserRecord,
  billing: { plan: BillingPlan; activatedAt: string | null; expiresAt: string | null }
): AdminUserSummary => {
  return {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    providerId: user.providerData[0]?.providerId || null,
    disabled: Boolean(user.disabled),
    emailVerified: Boolean(user.emailVerified),
    createdAt: toIsoOrNull(user.metadata.creationTime),
    lastSignInTime: toIsoOrNull(user.metadata.lastSignInTime),
    billingPlan: billing.plan,
    billingActivatedAt: billing.activatedAt,
    billingExpiresAt: billing.expiresAt,
  };
};

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").toLowerCase().trim();
  const limit = parseLimit(searchParams.get("limit"));

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const usersResult = await adminAuth.listUsers(1000);
    let users = usersResult.users;

    if (search) {
      users = users.filter((user) => {
        const fields = [user.uid, user.email || "", user.displayName || ""];
        return fields.some((field) => field.toLowerCase().includes(search));
      });
    }

    users = users
      .sort((a, b) => {
        const aTs = Date.parse(a.metadata.lastSignInTime || "1970-01-01");
        const bTs = Date.parse(b.metadata.lastSignInTime || "1970-01-01");
        return bTs - aTs;
      })
      .slice(0, limit);

    const billingRefs = users.map((user) =>
      adminDb.doc(`users/${user.uid}/billing/state`)
    );
    const billingSnapshots =
      billingRefs.length > 0 ? await adminDb.getAll(...billingRefs) : [];

    const billingByUid = new Map<string, { plan: BillingPlan; activatedAt: string | null; expiresAt: string | null }>();
    billingSnapshots.forEach((snapshot, index) => {
      const user = users[index];
      if (!user) return;
      billingByUid.set(user.uid, readBilling(snapshot.data()));
    });

    const payload = users.map((user) =>
      mapUser(user, billingByUid.get(user.uid) || { plan: "free", activatedAt: null, expiresAt: null })
    );

    return NextResponse.json({
      success: true,
      users: payload,
      generatedAt: new Date().toISOString(),
      actedBy: session.email || session.uid,
    });
  } catch (error) {
    console.error("FAILED_TO_LIST_USERS", { error, actedBy: session.email || session.uid });
    return NextResponse.json(
      { error: "FAILED_TO_LIST_USERS" },
      { status: 500 }
    );
  }
}
