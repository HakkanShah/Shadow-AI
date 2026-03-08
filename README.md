# ShadowWeb

Separate Next.js app for:

- Public Shadow documentation (`/`, `/docs`)
- Secure admin panel (`/admin`) for manual user/billing/account operations

This app is designed to be deployed separately (for example on Vercel) from the Shadow desktop app.

## Features

- Firebase Google sign-in for admin login
- Server-side session cookie auth for admin routes
- Admin access checks via:
  - Firebase custom claims (`admin: true`, `role: "admin"`, or `roles` includes `"admin"`)
  - Optional email allowlist via `ADMIN_ALLOWLIST_EMAILS`
- Manual billing management:
  - Updates `users/{uid}/billing/state` in Firestore
  - Supports plan `free` / `monthly` / `semiannual` / `yearly` / `lifetime`
- User status management:
  - Enable/disable Firebase Auth users
- User telemetry viewer:
  - Reads from `users/{uid}/devices`, `users/{uid}/loginEvents`, `users/{uid}/events`

## Environment Variables

Copy `.env.example` to `.env.local` and fill values.

### Firebase client (browser sign-in)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Firebase Admin (server API)

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (use escaped newlines: `\n`)

### Optional admin allowlist fallback

- `ADMIN_ALLOWLIST_EMAILS` (comma-separated)

## Admin Claim Setup (recommended)

Use Firebase Admin SDK from any trusted environment:

```ts
await admin.auth().setCustomUserClaims("<uid>", { admin: true });
```

Then force token refresh by logging out/in.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy

- Deploy folder `ShadowWeb` as a standalone Next.js project
- Set all environment variables in Vercel Project Settings
- Keep Shadow desktop app and ShadowWeb deployment as separate repos/projects
