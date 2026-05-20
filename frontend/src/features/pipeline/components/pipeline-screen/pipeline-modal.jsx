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
  memberships,
  value,
  managePipelineId,
  onUserChange,
  onTogglePipeline,
  onPermissionChange,
  onManagePipelineChange,
  onMembershipPermissionChange,
  onMembershipRemove,
  onClose,
  onSubmit,
  loading = false,
  membershipsLoading = false,
  membershipSavingId = null,
  membershipRemovingId = null,
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

          <div className={styles.membersSection}>
            <div className={styles.membersSectionHeader}>
              <div>
                <p className={styles.assignmentTitle}>Manage members</p>
                <p className={styles.membersCopy}>Review current access on a pipeline you can manage.</p>
              </div>
              <label className={styles.membersPipelineField}>
                <span className={styles.visuallyHidden}>Choose pipeline members to manage</span>
                <select value={managePipelineId} onChange={(event) => onManagePipelineChange(event.target.value)}>
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={String(pipeline.id)}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {membershipsLoading ? (
              <div className={styles.membersEmptyState}>
                <strong>Loading members</strong>
                <p>Please wait while we load pipeline access.</p>
              </div>
            ) : memberships.length ? (
              <div className={styles.membersList}>
                {memberships.map((membership) => (
                  <article key={membership.id} className={styles.memberCard}>
                    <div className={styles.memberIdentity}>
                      <div>
                        <strong>{membership.user.full_name}</strong>
                        <p>{membership.user.email}</p>
                      </div>
                      <button
                        className={styles.memberRemoveButton}
                        type="button"
                        onClick={() => onMembershipRemove(membership.id)}
                        disabled={membershipRemovingId === membership.id || membershipSavingId === membership.id}
                      >
                        {membershipRemovingId === membership.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                    <div className={styles.memberPermissionGrid}>
                      <label className={styles.optionCard}>
                        <input
                          type="checkbox"
                          checked={membership.can_invite_members}
                          onChange={(event) => onMembershipPermissionChange(membership.id, "can_invite_members", event.target.checked)}
                          disabled={membershipSavingId === membership.id || membershipRemovingId === membership.id}
                        />
                        <span>Can invite members</span>
                      </label>
                      <label className={styles.optionCard}>
                        <input
                          type="checkbox"
                          checked={membership.can_edit_pipeline}
                          onChange={(event) => onMembershipPermissionChange(membership.id, "can_edit_pipeline", event.target.checked)}
                          disabled={membershipSavingId === membership.id || membershipRemovingId === membership.id}
                        />
                        <span>Can edit pipeline</span>
                      </label>
                      <label className={styles.optionCard}>
                        <input
                          type="checkbox"
                          checked={membership.can_delete_pipeline}
                          onChange={(event) => onMembershipPermissionChange(membership.id, "can_delete_pipeline", event.target.checked)}
                          disabled={membershipSavingId === membership.id || membershipRemovingId === membership.id}
                        />
                        <span>Can delete pipeline</span>
                      </label>
                      <label className={styles.optionCard}>
                        <input
                          type="checkbox"
                          checked={membership.can_manage_statuses}
                          onChange={(event) => onMembershipPermissionChange(membership.id, "can_manage_statuses", event.target.checked)}
                          disabled={membershipSavingId === membership.id || membershipRemovingId === membership.id}
                        />
                        <span>Can manage statuses</span>
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.membersEmptyState}>
                <strong>No invited members yet</strong>
                <p>Invite a teammate above to start sharing this pipeline.</p>
              </div>
            )}
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

export function NoticeModal({ title, description, actionLabel, onAction, onClose }) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pipeline-notice-modal-title">
        <div className={styles.modalHeader}>
          <div>
            <h2 id="pipeline-notice-modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Close
            </button>
            {actionLabel && onAction ? (
              <button className={styles.primaryButton} type="button" onClick={onAction}>
                {actionLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
