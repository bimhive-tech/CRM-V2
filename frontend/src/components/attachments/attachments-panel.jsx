"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DownloadIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";
import { deleteAttachment, downloadAttachment, listAttachments, uploadAttachment } from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import styles from "./attachments-panel.module.css";

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function initialsForUploader(person) {
  const value = person?.full_name || person?.email || "User";
  return (
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function buildAttachmentQuery(targetType, targetId, includeRelated, relatedScope) {
  return {
    target_type: targetType,
    target_id: targetId,
    ...(includeRelated ? { include_related: "true" } : {}),
    ...(relatedScope ? { related_scope: relatedScope } : {}),
  };
}

export function AttachmentsPanel({
  targetType,
  targetId,
  active = false,
  includeRelated = false,
  relatedScope = "",
  description = "",
  showSource = false,
}) {
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [state, setState] = useState({ loading: false, uploading: false, deletingId: null, error: "", success: "" });

  const loadAttachments = useCallback(async () => {
    if (!targetId) {
      return;
    }

    setState((current) => ({ ...current, loading: true }));
    try {
      const nextAttachments = await listAttachments(
        getAccessToken(),
        buildAttachmentQuery(targetType, targetId, includeRelated, relatedScope),
      );
      setAttachments(nextAttachments || []);
      setState((current) => ({ ...current, loading: false, error: "" }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || "Unable to load attachments.",
      }));
    }
  }, [includeRelated, relatedScope, targetId, targetType]);

  useEffect(() => {
    if (!active || !targetId) {
      return;
    }
    loadAttachments();
  }, [active, loadAttachments, targetId]);

  async function handleFilesSelected(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setState((current) => ({ ...current, uploading: true, error: "", success: "" }));
    try {
      for (const file of files) {
        await uploadAttachment(getAccessToken(), file, { target_type: targetType, target_id: targetId });
      }
      await loadAttachments();
      setState((current) => ({
        ...current,
        uploading: false,
        success: files.length > 1 ? "Attachments uploaded." : "Attachment uploaded.",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        uploading: false,
        error: error.message || "Unable to upload attachment.",
      }));
    } finally {
      event.target.value = "";
    }
  }

  async function handleDelete(attachmentId) {
    setState((current) => ({ ...current, deletingId: attachmentId, error: "", success: "" }));
    try {
      await deleteAttachment(getAccessToken(), attachmentId);
      setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
      setState((current) => ({ ...current, deletingId: null, success: "Attachment deleted." }));
    } catch (error) {
      setState((current) => ({
        ...current,
        deletingId: null,
        error: error.message || "Unable to delete attachment.",
      }));
    }
  }

  async function handleDownload(attachment) {
    setState((current) => ({ ...current, error: "", success: "" }));
    try {
      await downloadAttachment(getAccessToken(), attachment.id, attachment.original_name);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message || "Unable to download attachment.",
      }));
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.copy}>
          <h3>Attachments</h3>
          <p>{description || "Upload files for this record, download them later, or remove anything you no longer need."}</p>
        </div>
        <div className={styles.actions}>
          <input ref={fileInputRef} className={styles.hiddenInput} type="file" multiple onChange={handleFilesSelected} />
          <button
            className={styles.uploadButton}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={state.uploading}
          >
            {state.uploading ? "Uploading..." : "Upload files"}
          </button>
        </div>
      </div>

      {state.error ? <p className={styles.statusError}>{state.error}</p> : null}
      {state.success ? <p className={styles.statusSuccess}>{state.success}</p> : null}

      {state.loading ? (
        <div className={styles.empty}>
          <strong>Loading attachments</strong>
          <p>Please wait while we load the files for this record.</p>
        </div>
      ) : attachments.length ? (
        <div className={styles.list}>
          {attachments.map((attachment) => (
            <article key={attachment.id} className={styles.item}>
              <div className={styles.itemMeta}>
                <div className={styles.itemHeader}>
                  <strong>{attachment.original_name}</strong>
                </div>
                <p>{`${formatFileSize(attachment.file_size)} · Uploaded ${formatDate(attachment.created_at)}`}</p>
                <div className={styles.uploaderRow}>
                  <span className={styles.uploaderAvatar} aria-hidden="true">
                    {initialsForUploader(attachment.uploaded_by)}
                  </span>
                  <p className={styles.uploaderMeta}>
                    <span>{attachment.uploaded_by?.full_name || attachment.uploaded_by?.email || "Unknown uploader"}</span>
                    {attachment.source?.subtitle ? <span>{attachment.source.subtitle}</span> : null}
                  </p>
                </div>
              </div>

              <div className={styles.itemActions}>
                {showSource && attachment.source?.label ? (
                  <span className={styles.sourceBadge}>
                    {attachment.source.label}
                    {attachment.source?.name ? `: ${attachment.source.name}` : ""}
                  </span>
                ) : null}
                <div className={styles.actionButtons}>
                  <button
                    className={styles.iconButton}
                    type="button"
                    onClick={() => handleDownload(attachment)}
                    aria-label={`Download ${attachment.original_name}`}
                    title="Download"
                  >
                    <DownloadIcon />
                  </button>
                  <button
                    className={`${styles.iconButton} ${styles.dangerIconButton}`}
                    type="button"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={state.deletingId === attachment.id}
                    aria-label={`${state.deletingId === attachment.id ? "Deleting" : "Delete"} ${attachment.original_name}`}
                    title={state.deletingId === attachment.id ? "Deleting..." : "Delete"}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <strong>No attachments yet</strong>
          <p>Upload the first file for this record and it will appear here.</p>
        </div>
      )}
    </div>
  );
}
