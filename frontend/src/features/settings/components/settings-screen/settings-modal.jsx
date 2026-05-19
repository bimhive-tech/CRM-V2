import styles from "./settings-screen.module.css";

export function SettingsModal({ title, description, onClose, onSubmit, submitLabel, children }) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.panelEyebrow}>Settings</p>
            <h3>{title}</h3>
            {description ? <p className={styles.modalCopy}>{description}</p> : null}
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={onSubmit}>
          {children}
          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
