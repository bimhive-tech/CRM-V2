import styles from "./pipeline-screen.module.css";

export function PipelineModal({
  title,
  description,
  value,
  colorValue,
  onChange,
  onColorChange,
  onClose,
  onSubmit,
  submitLabel,
  placeholder,
  showColorField = false,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pipeline-modal-title">
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
          {showColorField ? (
            <label className={styles.field}>
              <span>Color</span>
              <div className={styles.colorField}>
                <input className={styles.colorInput} type="color" value={colorValue} onChange={(event) => onColorChange(event.target.value)} />
                <span className={styles.colorValue}>{colorValue}</span>
              </div>
            </label>
          ) : null}
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
    <div className={styles.modalOverlay} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-delete-modal-title"
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

export function PipelineInviteModal({
  users,
  pipelines,
  value,
  onUserChange,
  onTogglePipeline,
  onPermissionChange,
  onClose,
  onSubmit,
  loading = false,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={`${styles.modal} ${styles.inviteModal}`} role="dialog" aria-modal="true" aria-labelledby="pipeline-invite-modal-title">
        <div className={styles.modalHeader}>
          <div>
            <h2 id="pipeline-invite-modal-title">Invite To Pipelines</h2>
            <p>Pick a teammate, choose the pipelines you can invite them to, and set what they can manage there.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        <form className={styles.modalBody} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span>User</span>
            <select value={value.userId} onChange={(event) => onUserChange(event.target.value)} required>
              <option value="">Choose a user</option>
              {users.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
          </label>

          <div className={styles.assignmentSection}>
            <p className={styles.assignmentTitle}>Pipelines</p>
            <div className={styles.optionGrid}>
              {pipelines.map((pipeline) => (
                <label key={pipeline.id} className={styles.optionCard}>
                  <input
                    type="checkbox"
                    checked={value.pipelineIds.includes(String(pipeline.id))}
                    onChange={() => onTogglePipeline(String(pipeline.id))}
                  />
                  <span>{pipeline.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.assignmentSection}>
            <p className={styles.assignmentTitle}>Pipeline permissions</p>
            <div className={styles.optionGrid}>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_invite_members}
                  onChange={(event) => onPermissionChange("can_invite_members", event.target.checked)}
                />
                <span>Can invite members</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_edit_pipeline}
                  onChange={(event) => onPermissionChange("can_edit_pipeline", event.target.checked)}
                />
                <span>Can edit pipeline</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_delete_pipeline}
                  onChange={(event) => onPermissionChange("can_delete_pipeline", event.target.checked)}
                />
                <span>Can delete pipeline</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_manage_statuses}
                  onChange={(event) => onPermissionChange("can_manage_statuses", event.target.checked)}
                />
                <span>Can manage statuses</span>
              </label>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit" disabled={loading || !value.userId || !value.pipelineIds.length}>
              {loading ? "Sending..." : "Send access"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
