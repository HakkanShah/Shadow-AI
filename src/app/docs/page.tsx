import Link from "next/link";
import styles from "./styles.module.css";

const sections = [
  {
    title: "What Is Shadow?",
    body: "Shadow is an ethical AI assistant desktop app focused on real-time interview help, meeting assistance, coding support, and aptitude problem solving."
  },
  {
    title: "Authentication",
    body: "Users sign in with Google through Firebase Auth. Sessions are isolated per account on device, with account-scoped data and entitlement checks."
  },
  {
    title: "Billing & Activation",
    body: "Billing is manual right now. Access is controlled by Firestore document users/{uid}/billing/state with plan set to free or lifetime."
  },
  {
    title: "Data & Privacy",
    body: "Shadow is designed with privacy-first principles. Local storage is used for chat/transcript data, and cloud access is minimized where possible."
  }
];

export default function DocsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>Shadow Documentation</div>
        <nav className={styles.nav}>
          <Link href="/">Home</Link>
          <Link href="/admin/login">Admin Login</Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p>Product Notes</p>
          <h1>Everything your team needs to operate Shadow with confidence.</h1>
        </section>

        <section className={styles.grid}>
          {sections.map((section) => (
            <article key={section.title} className={styles.card}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
