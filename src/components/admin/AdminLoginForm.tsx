"use client";

import { useMemo, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase-client";
import styles from "./AdminLoginForm.module.css";

const errorMessageByCode: Record<string, string> = {
  ADMIN_ACCESS_REQUIRED:
    "Signed in successfully, but this account does not have admin access.",
  RECENT_LOGIN_REQUIRED: "Please sign in again and retry.",
  AUTH_FAILED: "Authentication failed. Please retry.",
};

export default function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useMemo(() => getFirebaseAuth(), []);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken(true);

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        const code = payload?.error || "AUTH_FAILED";
        await signOut(auth).catch(() => {});
        throw new Error(code);
      }

      router.push("/admin");
      router.refresh();
    } catch (caught) {
      const code = String(caught).replace("Error: ", "").trim();
      setError(errorMessageByCode[code] || "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <p className={styles.kicker}>ShadowWeb Admin</p>
        <h1>Secure Admin Sign-In</h1>
        <p className={styles.copy}>
          Use a Firebase-authenticated Google account with admin claim or allowlist access.
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button
          type="button"
          className={styles.button}
          onClick={() => void handleSignIn()}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
