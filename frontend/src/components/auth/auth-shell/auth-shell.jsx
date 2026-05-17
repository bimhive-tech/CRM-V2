import styles from "./auth-shell.module.css";

export function AuthShell({ children }) {
  return (
    <main className={styles.page}>
      <aside className={styles.brandPanel}>
        <div className={styles.gridLayer} aria-hidden="true" />
        <div className={styles.gridLayerSecondary} aria-hidden="true" />
        <div className={styles.copyWrap}>
          <p className={styles.eyebrow}>WORKSPACE OPERATIONS</p>
          <h1 className={styles.heading}>Your client work, reminders, and sheets in one calm place.</h1>
          <span className={styles.line} aria-hidden="true" />
          <div className={styles.tagRow}>
            <span>Calendar</span>
            <span>Reminders</span>
            <span>Sheets</span>
            <span>Insights</span>
          </div>
        </div>
      </aside>
      <section className={styles.formPanel}>{children}</section>
    </main>
  );
}
