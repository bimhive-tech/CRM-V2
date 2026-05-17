import { ClipboardIcon } from "@/components/dashboard/dashboard-icons";

import styles from "./data-panel.module.css";

export function DataPanel({ title, actionLabel, emptyTitle, emptyCopy, children }) {
  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2>{title}</h2>
        {actionLabel ? <button type="button">{actionLabel}</button> : null}
      </header>
      {children ? (
        <div className={styles.content}>{children}</div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <ClipboardIcon />
          </span>
          <strong>{emptyTitle}</strong>
          <p>{emptyCopy}</p>
        </div>
      )}
    </section>
  );
}
