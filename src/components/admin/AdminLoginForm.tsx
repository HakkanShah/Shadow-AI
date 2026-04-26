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
        <div className={styles.brand}>
          <svg viewBox="0 0 32 32" fill="none">
            <path
              d="M2 16 C 8 6, 24 6, 30 16 C 24 26, 8 26, 2 16 Z"
              stroke="white"
              strokeOpacity="0.9"
              strokeWidth="1.6"
            />
            <circle cx="16" cy="16" r="6" stroke="#b86bff" strokeWidth="1.6" />
            <circle cx="16" cy="16" r="2.6" fill="#b86bff" />
          </svg>
          <span>Shadow</span>
        </div>

        <p className={styles.kicker}>Restricted Area</p>
        <h1>Admin sign-in.</h1>
        <p className={styles.copy}>
          Google account with admin claim or allowlist access required.
        </p>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button
          type="button"
          className={styles.button}
          onClick={() => void handleSignIn()}
          disabled={loading}
        >
          {loading ? (
            "Signing in..."
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="#4285F4"
                  d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.45.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className={styles.footnote}>v1.0.6 · firebase auth · session cookie</p>
      </div>
    </div>
  );
}
