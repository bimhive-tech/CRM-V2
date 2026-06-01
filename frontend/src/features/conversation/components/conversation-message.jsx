import { EditIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";

import styles from "@/app/conversation/page.module.css";

function formatTimestamp(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ConversationMessage({
  canDelete,
  canEdit,
  editing,
  message,
  onCancelEdit,
  onChangeEditBody,
  onDelete,
  onStartEdit,
  onSubmitEdit,
  ownMessage,
  saving,
  value,
}) {
  return (
    <article className={`${styles.message} ${ownMessage ? styles.messageOwn : ""}`}>
      <div className={styles.messageMeta}>
        <strong>{message.sender?.full_name || "Unknown user"}</strong>
        <span>
          {formatTimestamp(message.created_at)}
          {message.is_edited ? " · edited" : ""}
        </span>
      </div>

      {editing ? (
        <form className={styles.messageEditForm} onSubmit={onSubmitEdit}>
          <textarea value={value} onChange={(event) => onChangeEditBody(event.target.value)} rows={3} />
          <div className={styles.messageActions}>
            <button className={styles.ghostButton} type="button" onClick={onCancelEdit}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit" disabled={saving || !value.trim()}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>{message.body}</p>
          {ownMessage && (canEdit || canDelete) ? (
            <div className={styles.messageActions}>
              {canEdit ? (
                <button className={styles.messageActionButton} type="button" onClick={onStartEdit} aria-label="Edit message" title="Edit message">
                  <EditIcon />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  className={styles.messageDangerButton}
                  type="button"
                  onClick={onDelete}
                  disabled={saving}
                  aria-label="Delete message"
                  title="Delete message"
                >
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
