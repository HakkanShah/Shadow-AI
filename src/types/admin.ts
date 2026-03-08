export type BillingPlan = "free" | "monthly" | "semiannual" | "yearly" | "lifetime";

export type AdminUserSummary = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string | null;
  disabled: boolean;
  emailVerified: boolean;
  lastSignInTime: string | null;
  createdAt: string | null;
  billingPlan: BillingPlan;
  billingActivatedAt: string | null;
  billingExpiresAt: string | null;
};

export type ActivityRecord = {
  id: string;
  data: Record<string, unknown>;
};

export type AdminUserDetail = {
  user: AdminUserSummary;
  devices: ActivityRecord[];
  logins: ActivityRecord[];
  events: ActivityRecord[];
  billingRaw: Record<string, unknown> | null;
};
