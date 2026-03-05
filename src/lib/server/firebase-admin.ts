import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const getPrivateKey = (): string => {
  return requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
};

export const getFirebaseAdminApp = (): App => {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  app = initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getPrivateKey(),
    }),
  });

  return app;
};

export const getAdminAuth = () => getAuth(getFirebaseAdminApp());
export const getAdminDb = () => getFirestore(getFirebaseAdminApp());
