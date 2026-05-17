import styles from "./dashboard-shell.module.css";

export function DashboardShell({ sidebar, topbar, children }) {
  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>{sidebar}</aside>
      <section className={styles.content}>
        <header className={styles.topbar}>{topbar}</header>
        <div className={styles.body}>{children}</div>
      </section>
    </main>
  );
}
