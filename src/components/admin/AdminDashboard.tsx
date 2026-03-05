"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { AdminUserDetail, AdminUserSummary, BillingPlan } from "@/types/admin";
import styles from "./AdminDashboard.module.css";

type Props = {
  adminLabel: string;
};

type UsersApiResponse = {
  users?: AdminUserSummary[];
  error?: string;
};

type UserDetailApiResponse = {
  detail?: AdminUserDetail;
  error?: string;
};

const prettyValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
};

export default function AdminDashboard({ adminLabel }: Props) {
  const router = useRouter();
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [plan, setPlan] = useState<BillingPlan>("free");
  const [note, setNote] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async (searchText = "") => {
    setLoadingUsers(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (searchText.trim()) params.set("search", searchText.trim());
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const payload = (await response.json()) as UsersApiResponse;
      if (!response.ok) throw new Error(payload.error || "FAILED_TO_LOAD_USERS");
      const nextUsers = payload.users || [];
      setUsers(nextUsers);

      if (!selectedUid && nextUsers.length > 0) {
        setSelectedUid(nextUsers[0].uid);
      }
    } catch (caught) {
      setError(String(caught).replace("Error: ", ""));
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDetail = async (uid: string) => {
    if (!uid) return;
    setLoadingDetail(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`);
      const payload = (await response.json()) as UserDetailApiResponse;
      if (!response.ok || !payload.detail) {
        throw new Error(payload.error || "FAILED_TO_LOAD_USER");
      }
      setDetail(payload.detail);
      setPlan(payload.detail.user.billingPlan);
      setNote(typeof payload.detail.billingRaw?.note === "string" ? payload.detail.billingRaw.note : "");
    } catch (caught) {
      setError(String(caught).replace("Error: ", ""));
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUid) return;
    void loadDetail(selectedUid);
  }, [selectedUid]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "DELETE" }).catch(() => {});
    await signOut(auth).catch(() => {});
    router.push("/admin/login");
    router.refresh();
  };

  const saveBilling = async () => {
    if (!selectedUid) return;
    setSavingBilling(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(selectedUid)}/billing`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, note }),
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) throw new Error(payload?.error || "FAILED_TO_SAVE_BILLING");
      await loadUsers(query);
      await loadDetail(selectedUid);
    } catch (caught) {
      setError(String(caught).replace("Error: ", ""));
    } finally {
      setSavingBilling(false);
    }
  };

  const saveStatus = async (disabled: boolean) => {
    if (!selectedUid) return;
    setSavingStatus(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(selectedUid)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disabled }),
        }
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) throw new Error(payload?.error || "FAILED_TO_SAVE_STATUS");
      await loadUsers(query);
      await loadDetail(selectedUid);
    } catch (caught) {
      setError(String(caught).replace("Error: ", ""));
    } finally {
      setSavingStatus(false);
    }
  };

  const selectedUser = detail?.user || null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>ShadowWeb Admin</p>
          <h1>Operations Panel</h1>
          <p className={styles.subline}>Signed in as {adminLabel}</p>
        </div>
        <button type="button" className={styles.logout} onClick={() => void handleLogout()}>
          Logout
        </button>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <main className={styles.grid}>
        <section className={styles.usersPane}>
          <div className={styles.usersPaneTop}>
            <h2>Users</h2>
            <button
              type="button"
              className={styles.refresh}
              onClick={() => void loadUsers(query)}
              disabled={loadingUsers}
            >
              {loadingUsers ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className={styles.searchRow}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by email, uid, name"
            />
            <button type="button" onClick={() => void loadUsers(query)} disabled={loadingUsers}>
              Search
            </button>
          </div>
          <div className={styles.userList}>
            {users.map((user) => (
              <button
                type="button"
                key={user.uid}
                className={`${styles.userItem} ${
                  selectedUid === user.uid ? styles.userItemActive : ""
                }`}
                onClick={() => setSelectedUid(user.uid)}
              >
                <div className={styles.userHead}>
                  <strong>{user.displayName || user.email || user.uid}</strong>
                  <span
                    className={
                      user.billingPlan === "lifetime" ? styles.planLifetime : styles.planFree
                    }
                  >
                    {user.billingPlan}
                  </span>
                </div>
                <p>{user.email || "No email"}</p>
                <p className={styles.mono}>{user.uid}</p>
              </button>
            ))}
            {!loadingUsers && users.length === 0 ? <p className={styles.empty}>No users found.</p> : null}
          </div>
        </section>

        <section className={styles.detailPane}>
          {!selectedUser ? (
            <p className={styles.empty}>Select a user to view details.</p>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <h2>{selectedUser.displayName || selectedUser.email || selectedUser.uid}</h2>
                <p className={styles.mono}>{selectedUser.uid}</p>
              </div>

              <div className={styles.card}>
                <h3>Account Status</h3>
                <p>Email: {selectedUser.email || "-"}</p>
                <p>Provider: {selectedUser.providerId || "-"}</p>
                <p>Email Verified: {selectedUser.emailVerified ? "Yes" : "No"}</p>
                <p>Last Sign-In: {selectedUser.lastSignInTime || "-"}</p>
                <p>Disabled: {selectedUser.disabled ? "Yes" : "No"}</p>
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.disableBtn}
                    onClick={() => void saveStatus(!selectedUser.disabled)}
                    disabled={savingStatus || loadingDetail}
                  >
                    {savingStatus
                      ? "Saving..."
                      : selectedUser.disabled
                        ? "Enable User"
                        : "Disable User"}
                  </button>
                </div>
              </div>

              <div className={styles.card}>
                <h3>Billing (Manual)</h3>
                <p>Current Plan: {selectedUser.billingPlan}</p>
                <p>Activated At: {selectedUser.billingActivatedAt || "-"}</p>
                <div className={styles.formGrid}>
                  <label>
                    Plan
                    <select
                      value={plan}
                      onChange={(event) => setPlan(event.target.value as BillingPlan)}
                    >
                      <option value="free">Free</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </label>
                  <label>
                    Internal Note
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Optional note about manual activation/deactivation"
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => void saveBilling()}
                    disabled={savingBilling || loadingDetail}
                  >
                    {savingBilling ? "Saving..." : "Save Billing"}
                  </button>
                </div>
              </div>

              <div className={styles.card}>
                <h3>Devices ({detail?.devices.length || 0})</h3>
                <div className={styles.activityList}>
                  {(detail?.devices || []).map((entry) => (
                    <div key={entry.id} className={styles.activityItem}>
                      <strong>{entry.id}</strong>
                      <p>{prettyValue(entry.data)}</p>
                    </div>
                  ))}
                  {(detail?.devices.length || 0) === 0 ? (
                    <p className={styles.empty}>No remote device records yet.</p>
                  ) : null}
                </div>
              </div>

              <div className={styles.card}>
                <h3>Login Events ({detail?.logins.length || 0})</h3>
                <div className={styles.activityList}>
                  {(detail?.logins || []).map((entry) => (
                    <div key={entry.id} className={styles.activityItem}>
                      <strong>{entry.id}</strong>
                      <p>{prettyValue(entry.data)}</p>
                    </div>
                  ))}
                  {(detail?.logins.length || 0) === 0 ? (
                    <p className={styles.empty}>No remote login events yet.</p>
                  ) : null}
                </div>
              </div>

              <div className={styles.card}>
                <h3>App Events ({detail?.events.length || 0})</h3>
                <div className={styles.activityList}>
                  {(detail?.events || []).map((entry) => (
                    <div key={entry.id} className={styles.activityItem}>
                      <strong>{entry.id}</strong>
                      <p>{prettyValue(entry.data)}</p>
                    </div>
                  ))}
                  {(detail?.events.length || 0) === 0 ? (
                    <p className={styles.empty}>No remote app events yet.</p>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
