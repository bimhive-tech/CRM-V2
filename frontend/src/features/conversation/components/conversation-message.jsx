import { useEffect, useRef, useState } from "react";

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

function getInitials(value) {
  return String(value || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const senderName = message.sender?.full_name || "Unknown user";

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <article className={`${styles.messageRow} ${ownMessage ? styles.messageRowOwn : ""}`}>
      <div className={styles.messageAvatar} aria-hidden="true">
        {getInitials(senderName)}
      </div>

      <div className={styles.messageContent}>
        <div className={`${styles.messageHeader} ${ownMessage ? styles.messageHeaderOwn : ""}`}>
          <div className={`${styles.messageMeta} ${ownMessage ? styles.messageMetaOwn : ""}`}>
            <strong>{senderName}</strong>
            <span>
              {formatTimestamp(message.created_at)}
              {message.is_edited ? " · edited" : ""}
            </span>
          </div>
        </div>

        <div className={`${styles.messageBubbleRow} ${ownMessage ? styles.messageBubbleRowOwn : ""}`}>
          {ownMessage && (canEdit || canDelete) && !editing ? (
            <div
              ref={menuRef}
              className={`${styles.messageMenuWrap} ${ownMessage ? styles.messageMenuWrapOwn : ""}`}
            >
              <button
                className={styles.messageMenuButton}
                type="button"
                aria-label="Open message actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((current) => !current)}
              >
                <span className={styles.messageMenuDots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
              {menuOpen ? (
                <div className={styles.messageMenu}>
                  {canEdit ? (
                    <button
                      className={styles.messageMenuItem}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onStartEdit();
                      }}
                    >
                      <EditIcon />
                      <span>Edit</span>
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      className={`${styles.messageMenuItem} ${styles.messageMenuDanger}`}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                      disabled={saving}
                    >
                      <TrashIcon />
                      <span>Delete</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={`${styles.messageBubble} ${ownMessage ? styles.messageBubbleOwn : ""}`}>
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
              <p>{message.body}</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
