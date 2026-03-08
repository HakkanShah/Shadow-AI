import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>ShadowWeb</div>
        <nav className={styles.nav}>
          <Link href="/docs">Documentation</Link>
          <Link href="/admin/login">Admin Login</Link>
        </nav>
      </header>

      <main className={styles.main}>
        <p className={styles.kicker}>AI Assistant Operations Hub</p>
        <h1>Manage Shadow users, access activation, and operations from one panel.</h1>
        <p className={styles.description}>
          ShadowWeb separates public product docs from secure admin controls. Deploy this app independently on Vercel and keep manual billing activation exactly the way you currently run it.
        </p>

        <div className={styles.actions}>
          <Link className={styles.primary} href="/admin/login">
            Open Admin Panel
          </Link>
          <Link className={styles.secondary} href="/docs">
            Read Docs
          </Link>
        </div>

        <section className={styles.features}>
          <article>
            <h2>Admin Controls</h2>
            <p>Search users, open account profiles, manually activate any membership plan, and manage account status.</p>
          </article>
          <article>
            <h2>Security First</h2>
            <p>Firebase Google sign-in + server-verified admin session cookies + role/allowlist checks.</p>
          </article>
          <article>
            <h2>Manual Billing Ready</h2>
            <p>No Stripe dependency. Admin tools update Firestore `users/{`{uid}`}/billing/state` directly.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
