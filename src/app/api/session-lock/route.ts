import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

const LEASE_TTL_MS = 45_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const CLAIM_RATE_LIMIT_WINDOW_MS = 60_000;
const CLAIM_RATE_LIMIT_MAX = 20;
const HEARTBEAT_RATE_LIMIT_MAX = 300;
const RELEASE_RATE_LIMIT_MAX = 120;

const rateLimitBuckets = new Map<string, number[]>();

type SessionLockAction = "claim" | "heartbeat" | "release";

type SessionDoc = {
  leaseId?: unknown;
  deviceIdHash?: unknown;
};

const readBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
};

const sanitizeAction = (value: unknown): SessionLockAction | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "claim") return "claim";
  if (normalized === "heartbeat") return "heartbeat";
  if (normalized === "release") return "release";
  return null;
};

const sanitizeDeviceIdHash = (value: unknown): string | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-f0-9]{32,128}$/.test(normalized)) return null;
  return normalized;
};

const sanitizeLeaseId = (value: unknown): string | null => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (normalized.length < 8 || normalized.length > 128) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) return null;
  return normalized;
};

const sanitizeClientMeta = (value: unknown, maxLen = 96): string | null => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLen);
};

const getRateLimitMax = (action: SessionLockAction): number => {
  if (action === "claim") return CLAIM_RATE_LIMIT_MAX;
  if (action === "heartbeat") return HEARTBEAT_RATE_LIMIT_MAX;
  return RELEASE_RATE_LIMIT_MAX;
};

const exceedsRateLimit = (uid: string, action: SessionLockAction): boolean => {
  const now = Date.now();
  const key = `${uid}:${action}`;
  const current = rateLimitBuckets.get(key) || [];
  const recent = current.filter((timestamp) => now - timestamp <= CLAIM_RATE_LIMIT_WINDOW_MS);
  if (recent.length >= getRateLimitMax(action)) {
    rateLimitBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  rateLimitBuckets.set(key, recent);
  if (rateLimitBuckets.size > 5000) {
    for (const [bucketKey, timestamps] of rateLimitBuckets.entries()) {
      const alive = timestamps.filter((timestamp) => now - timestamp <= CLAIM_RATE_LIMIT_WINDOW_MS);
      if (alive.length === 0) {
        rateLimitBuckets.delete(bucketKey);
      } else {
        rateLimitBuckets.set(bucketKey, alive);
      }
    }
  }
  return false;
};

const jsonNoStore = (payload: Record<string, unknown>, init?: { status?: number }) => {
  const response = NextResponse.json(payload, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
};

export async function POST(request: NextRequest) {
  const bearerToken = readBearerToken(request);
  if (!bearerToken) {
    return jsonNoStore({ success: false, error: "ID_TOKEN_REQUIRED" }, { status: 401 });
  }

  let action: SessionLockAction | null = null;
  let payload: Record<string, unknown> = {};
  try {
    payload = ((await request.json()) || {}) as Record<string, unknown>;
    action = sanitizeAction(payload.action);
  } catch {
    return jsonNoStore({ success: false, error: "INVALID_REQUEST_BODY" }, { status: 400 });
  }

  if (!action) {
    return jsonNoStore({ success: false, error: "ACTION_REQUIRED" }, { status: 400 });
  }

  let uid = "";
  try {
    const decoded = await getAdminAuth().verifyIdToken(bearerToken, true);
    uid = decoded.uid || "";
  } catch {
    return jsonNoStore({ success: false, error: "AUTH_INVALID" }, { status: 401 });
  }

  if (!uid) {
    return jsonNoStore({ success: false, error: "AUTH_INVALID" }, { status: 401 });
  }

  if (exceedsRateLimit(uid, action)) {
    return jsonNoStore({ success: false, error: "RATE_LIMITED" }, { status: 429 });
  }

  const deviceIdHash = sanitizeDeviceIdHash(payload.deviceIdHash);
  if (!deviceIdHash) {
    return jsonNoStore({ success: false, error: "DEVICE_ID_REQUIRED" }, { status: 400 });
  }

  const appVersion = sanitizeClientMeta(payload.appVersion);
  const platform = sanitizeClientMeta(payload.platform);
  const db = getAdminDb();
  const sessionRef = db.doc(`users/${uid}/session/current`);
  const deviceRef = db.doc(`users/${uid}/devices/${deviceIdHash}`);
  const eventsRef = db.collection(`users/${uid}/loginEvents`);

  if (action === "claim") {
    const claimResult = await db.runTransaction(async (tx) => {
      const existingSnap = await tx.get(sessionRef);
      const existing = (existingSnap.exists ? existingSnap.data() : null) as SessionDoc | null;
      const previousLeaseId =
        typeof existing?.leaseId === "string" ? existing.leaseId.trim() : "";
      const previousDeviceId =
        typeof existing?.deviceIdHash === "string"
          ? existing.deviceIdHash.trim().toLowerCase()
          : "";

      const leaseId = randomUUID();
      const nowMs = Date.now();
      const expiresAtMs = nowMs + LEASE_TTL_MS;

      tx.set(
        sessionRef,
        {
          leaseId,
          deviceIdHash,
          appVersion: appVersion || null,
          platform: platform || null,
          claimedAt: FieldValue.serverTimestamp(),
          lastHeartbeatAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          expiresAtMs,
        },
        { merge: false }
      );

      const deviceSnap = await tx.get(deviceRef);
      const devicePayload: Record<string, unknown> = {
        uid,
        deviceIdHash,
        appVersion: appVersion || null,
        platform: platform || null,
        lastSeenAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!deviceSnap.exists) {
        devicePayload.firstSeenAt = FieldValue.serverTimestamp();
      }
      tx.set(deviceRef, devicePayload, { merge: true });

      return {
        leaseId,
        replaced:
          Boolean(previousLeaseId) &&
          previousLeaseId !== leaseId &&
          Boolean(previousDeviceId) &&
          previousDeviceId !== deviceIdHash,
        previousDeviceId: previousDeviceId || null,
        nowMs,
      };
    });

    try {
      await eventsRef.add({
        type: claimResult.replaced ? "claim_replaced" : "claim",
        uid,
        deviceIdHash,
        previousDeviceId: claimResult.previousDeviceId,
        leaseId: claimResult.leaseId,
        appVersion: appVersion || null,
        platform: platform || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {
      // best effort analytics/audit
    }

    return jsonNoStore({
      success: true,
      status: "active",
      leaseId: claimResult.leaseId,
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      leaseTtlMs: LEASE_TTL_MS,
      replaced: claimResult.replaced,
      serverTimeMs: claimResult.nowMs,
    });
  }

  const leaseId = sanitizeLeaseId(payload.leaseId);
  if (!leaseId) {
    return jsonNoStore({ success: false, error: "LEASE_ID_REQUIRED" }, { status: 400 });
  }

  if (action === "heartbeat") {
    const heartbeatResult = await db.runTransaction(async (tx) => {
      const currentSnap = await tx.get(sessionRef);
      if (!currentSnap.exists) {
        return { active: false, reason: "NO_ACTIVE_SESSION" as const };
      }

      const current = currentSnap.data() as SessionDoc;
      const currentLeaseId =
        typeof current.leaseId === "string" ? current.leaseId.trim() : "";
      const currentDeviceId =
        typeof current.deviceIdHash === "string"
          ? current.deviceIdHash.trim().toLowerCase()
          : "";
      if (!currentLeaseId || !currentDeviceId) {
        return { active: false, reason: "INVALID_SESSION_STATE" as const };
      }
      if (currentLeaseId !== leaseId || currentDeviceId !== deviceIdHash) {
        return { active: false, reason: "SESSION_REPLACED" as const };
      }

      tx.update(sessionRef, {
        lastHeartbeatAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAtMs: Date.now() + LEASE_TTL_MS,
        appVersion: appVersion || null,
        platform: platform || null,
      });
      tx.set(
        deviceRef,
        {
          uid,
          deviceIdHash,
          appVersion: appVersion || null,
          platform: platform || null,
          lastSeenAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { active: true as const };
    });

    if (!heartbeatResult.active) {
      return jsonNoStore({
        success: false,
        status: "revoked",
        reason: heartbeatResult.reason,
      });
    }

    return jsonNoStore({
      success: true,
      status: "active",
      leaseId,
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      leaseTtlMs: LEASE_TTL_MS,
      serverTimeMs: Date.now(),
    });
  }

  const releaseResult = await db.runTransaction(async (tx) => {
    const currentSnap = await tx.get(sessionRef);
    if (!currentSnap.exists) {
      return { released: false };
    }

    const current = currentSnap.data() as SessionDoc;
    const currentLeaseId =
      typeof current.leaseId === "string" ? current.leaseId.trim() : "";
    const currentDeviceId =
      typeof current.deviceIdHash === "string"
        ? current.deviceIdHash.trim().toLowerCase()
        : "";
    if (currentLeaseId !== leaseId || currentDeviceId !== deviceIdHash) {
      return { released: false };
    }

    tx.delete(sessionRef);
    return { released: true };
  });

  if (releaseResult.released) {
    try {
      await eventsRef.add({
        type: "release",
        uid,
        deviceIdHash,
        leaseId,
        appVersion: appVersion || null,
        platform: platform || null,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {
      // best effort analytics/audit
    }
  }

  return jsonNoStore({
    success: true,
    status: "released",
    released: releaseResult.released,
  });
}
