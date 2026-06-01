import { CloseIcon } from "@/components/dashboard/dashboard-icons";
import { SearchableMultiSelect } from "@/components/forms/searchable-select";

import styles from "@/app/conversation/page.module.css";

export function ConversationModal({
  form,
  participantsSummary,
  saving,
  title,
  userOptions,
  onChange,
  onClose,
  onSubmit,
  onToggleUser,
}) {
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalEyebrow}>Conversation</p>
            <h2>{title}</h2>
            <p className={styles.modalCopy}>
              Choose who can access this chat, then save it to start the conversation.
            </p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        <form className={styles.modalBody} onSubmit={onSubmit}>
          <label className={styles.field}>
            <span>Chat name</span>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="BIM Coordination Team"
            />
          </label>

          <label className={styles.field}>
            <span>Participants</span>
            <SearchableMultiSelect
              ariaLabel="Conversation participants"
              options={userOptions}
              placeholder="Choose participants"
              selectedValues={form.participant_ids}
              onToggle={onToggleUser}
            />
          </label>

          <p className={styles.helperCopy}>
            {participantsSummary}
          </p>

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save conversation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
