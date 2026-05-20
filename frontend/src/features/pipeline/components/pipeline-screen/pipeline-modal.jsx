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
              <label className={`${styles.optionCard} ${styles.optionCardWide}`}>
                <input
                  type="checkbox"
                  checked={value.has_full_access}
                  onChange={(event) => onPermissionChange("has_full_access", event.target.checked)}
                />
                <span>Full pipeline access</span>
              </label>
            </div>
          </div>

          <div className={styles.assignmentSection}>
            <p className={styles.assignmentTitle}>Workspace control</p>
            <div className={styles.optionGrid}>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_invite_members}
                  onChange={(event) => onPermissionChange("can_invite_members", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Can invite members</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_edit_pipeline}
                  onChange={(event) => onPermissionChange("can_edit_pipeline", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Can edit pipeline</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_delete_pipeline}
                  onChange={(event) => onPermissionChange("can_delete_pipeline", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Can delete pipeline</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_manage_statuses}
                  onChange={(event) => onPermissionChange("can_manage_statuses", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Can manage statuses</span>
              </label>
            </div>
          </div>

          <div className={styles.assignmentSection}>
            <p className={styles.assignmentTitle}>Contacts</p>
            <div className={styles.optionGrid}>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_view_contacts}
                  onChange={(event) => onPermissionChange("can_view_contacts", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>View contacts</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_move_contacts}
                  onChange={(event) => onPermissionChange("can_move_contacts", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Move contact cards</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_manage_contacts}
                  onChange={(event) => onPermissionChange("can_manage_contacts", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Create and edit contacts</span>
              </label>
            </div>
          </div>

          <div className={styles.assignmentSection}>
            <p className={styles.assignmentTitle}>CRM companies</p>
            <div className={styles.optionGrid}>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_view_companies}
                  onChange={(event) => onPermissionChange("can_view_companies", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>View companies</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_manage_companies}
                  onChange={(event) => onPermissionChange("can_manage_companies", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Create and edit companies</span>
              </label>
            </div>
          </div>

          <div className={styles.assignmentSection}>
            <p className={styles.assignmentTitle}>Deals</p>
            <div className={styles.optionGrid}>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_view_deals}
                  onChange={(event) => onPermissionChange("can_view_deals", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>View deals</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_move_deals}
                  onChange={(event) => onPermissionChange("can_move_deals", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Move deal cards</span>
              </label>
              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={value.can_manage_deals}
                  onChange={(event) => onPermissionChange("can_manage_deals", event.target.checked)}
                  disabled={value.has_full_access}
                />
                <span>Create and edit deals</span>
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

export function PipelineTeamModal({
  pipelineName,
  memberships,
  loading = false,
  membershipSavingId = null,
  membershipRemovingId = null,
  onPermissionChange,
  onMembershipRemove,
  onClose,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={`${styles.modal} ${styles.inviteModal}`} role="dialog" aria-modal="true" aria-labelledby="pipeline-team-modal-title">
        <div className={styles.modalHeader}>
          <div>
            <h2 id="pipeline-team-modal-title">Manage Team</h2>
            <p>Review who can access {pipelineName || "this pipeline"} and fine-tune what they can do inside it.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        <div className={styles.modalBody}>
          {loading ? (
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
                    {[
                      ["has_full_access", "Full pipeline access"],
                      ["can_invite_members", "Can invite members"],
                      ["can_edit_pipeline", "Can edit pipeline"],
                      ["can_delete_pipeline", "Can delete pipeline"],
                      ["can_manage_statuses", "Can manage statuses"],
                      ["can_view_contacts", "View contacts"],
                      ["can_move_contacts", "Move contact cards"],
                      ["can_manage_contacts", "Create and edit contacts"],
                      ["can_view_companies", "View companies"],
                      ["can_manage_companies", "Create and edit companies"],
                      ["can_view_deals", "View deals"],
                      ["can_move_deals", "Move deal cards"],
                      ["can_manage_deals", "Create and edit deals"],
                    ].map(([field, label]) => (
                      <label key={field} className={styles.optionCard}>
                        <input
                          type="checkbox"
                          checked={membership[field]}
                          onChange={(event) => onPermissionChange(membership.id, field, event.target.checked)}
                          disabled={membershipSavingId === membership.id || membershipRemovingId === membership.id || (membership.has_full_access && field !== "has_full_access")}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.membersEmptyState}>
              <strong>No invited members yet</strong>
              <p>Use the Invite button to share this pipeline with teammates.</p>
            </div>
          )}

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
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
