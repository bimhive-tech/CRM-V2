import styles from "./pipeline-screen.module.css";

export function PipelineModal({ title, description, value, onChange, onClose, onSubmit, submitLabel, placeholder }) {
  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pipeline-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 id="pipeline-modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        <form className={styles.modalBody} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span>Name</span>
            <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required />
          </label>
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

export function ConfirmDeleteModal({ title, description, value, onChange, onClose, onSubmit, submitLabel }) {
  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-delete-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="pipeline-delete-modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        <form className={styles.modalBody} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span>Type Confirm</span>
            <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Confirm" required />
          </label>
          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit" disabled={value.trim() !== "Confirm"}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
