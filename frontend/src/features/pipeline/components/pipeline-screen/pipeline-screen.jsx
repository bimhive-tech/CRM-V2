"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { CheckIcon, ClipboardIcon, PipelineIcon, PlusIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { createPipeline, createPipelineStatus, deletePipelineStatus, listPipelines, updatePipelineStatus } from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import { ConfirmDeleteModal, PipelineModal } from "./pipeline-modal";
import styles from "./pipeline-screen.module.css";

function StageBadge({ count }) {
  return <span className={styles.stageCount}>{count}</span>;
}

function reorderStatuses(statuses, draggingId, targetIndex) {
  const ordered = [...statuses];
  const draggingIndex = ordered.findIndex((item) => item.id === draggingId);

  if (draggingIndex === -1 || draggingIndex === targetIndex) {
    return ordered;
  }

  const [draggedItem] = ordered.splice(draggingIndex, 1);
  ordered.splice(targetIndex, 0, draggedItem);
  return ordered;
}

export function PipelineScreen({ user }) {
  const token = getAccessToken();
  const dragCommittedRef = useRef(false);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const [modalState, setModalState] = useState({ type: null, statusId: null });
  const [nameValue, setNameValue] = useState("");
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [dragState, setDragState] = useState({ draggingId: null, previewStatuses: null });

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === selectedPipelineId) || null,
    [pipelines, selectedPipelineId],
  );
  const visibleStatuses = dragState.previewStatuses || selectedPipeline?.statuses || [];

  async function loadPipelines() {
    setStatus((current) => ({ ...current, loading: true }));

    try {
      const nextPipelines = await listPipelines(token);
      setPipelines(nextPipelines);
      setSelectedPipelineId((current) => {
        if (current && nextPipelines.some((pipeline) => String(pipeline.id) === current)) {
          return current;
        }
        return nextPipelines[0] ? String(nextPipelines[0].id) : "";
      });
      setStatus({ loading: false, error: "", success: "" });
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to load pipelines.", success: "" });
    }
  }

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const nextPipelines = await listPipelines(token);
        if (!active) {
          return;
        }
        setPipelines(nextPipelines);
        setSelectedPipelineId(nextPipelines[0] ? String(nextPipelines[0].id) : "");
        setStatus({ loading: false, error: "", success: "" });
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus({ loading: false, error: error.message || "Unable to load pipelines.", success: "" });
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, [token]);

  function openModal(type, statusItem = null) {
    setNameValue(statusItem?.name || "");
    setDeleteConfirmValue("");
    setModalState({ type, statusId: statusItem?.id || null });
    setStatus((current) => ({ ...current, error: "" }));
  }

  function closeModal() {
    setNameValue("");
    setDeleteConfirmValue("");
    setModalState({ type: null, statusId: null });
  }

  function startStatusEditing(statusItem) {
    setEditingStatusId(statusItem.id);
    setEditingName(statusItem.name);
    setStatus((current) => ({ ...current, error: "" }));
  }

  function cancelStatusEditing() {
    setEditingStatusId(null);
    setEditingName("");
  }

  async function handleCreatePipeline(event) {
    event.preventDefault();

    try {
      const created = await createPipeline(token, { name: nameValue.trim() });
      const nextPipelines = await listPipelines(token);
      setPipelines(nextPipelines);
      setSelectedPipelineId(String(created.id));
      setStatus({ loading: false, error: "", success: "Pipeline created." });
      closeModal();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to create pipeline.", success: "" });
    }
  }

  async function handleCreateStatus(event) {
    event.preventDefault();

    if (!selectedPipeline) {
      return;
    }

    try {
      await createPipelineStatus(token, selectedPipeline.id, { name: nameValue.trim() });
      await loadPipelines();
      setStatus({ loading: false, error: "", success: "Status added." });
      closeModal();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to add status.", success: "" });
    }
  }

  async function saveStatusName(statusId) {
    if (!statusId || !editingName.trim()) {
      return;
    }

    try {
      await updatePipelineStatus(token, statusId, { name: editingName.trim() });
      await loadPipelines();
      setStatus({ loading: false, error: "", success: "Status updated." });
      cancelStatusEditing();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to update status.", success: "" });
    }
  }

  async function handleDeleteStatus(event) {
    event.preventDefault();

    if (!modalState.statusId || deleteConfirmValue.trim() !== "Confirm") {
      return;
    }

    try {
      await deletePipelineStatus(token, modalState.statusId);
      await loadPipelines();
      setStatus({ loading: false, error: "", success: "Status removed." });
      closeModal();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to remove status.", success: "" });
    }
  }

  async function moveStatusToPosition(statusId, nextPosition) {
    if (!selectedPipeline) {
      return;
    }

    const statusItem = selectedPipeline.statuses.find((item) => item.id === statusId);
    if (!statusItem || statusItem.position === nextPosition) {
      return;
    }

    try {
      await updatePipelineStatus(token, statusId, { position: nextPosition });
      await loadPipelines();
      setStatus({ loading: false, error: "", success: "Status order updated." });
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to reorder status.", success: "" });
    }
  }

  return (
    <DashboardShell
      sidebar={<Sidebar user={user} />}
      topbar={
        <Topbar
          user={user}
          breadcrumbs={[
            { label: "Workspace", href: "/dashboard" },
            { label: "Pipeline", href: "/pipeline" },
            ...(selectedPipeline?.name ? [{ label: selectedPipeline.name }] : []),
          ]}
        />
      }
    >
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Pipeline</p>
            <h1>Shape each workflow around your sales motion</h1>
            <p className={styles.copy}>
              Switch between pipelines, create new stage flows, and keep every status column in the right order.
            </p>
          </div>
          <div className={styles.heroActions}>
            <label className={styles.pipelineSelect}>
              <span className={styles.visuallyHidden}>Choose pipeline</span>
              <select
                value={selectedPipelineId}
                onChange={(event) => setSelectedPipelineId(event.target.value)}
                disabled={!pipelines.length}
              >
                {pipelines.length ? (
                  pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))
                ) : (
                  <option value="">No pipelines yet</option>
                )}
              </select>
            </label>
            <button className={styles.primaryButton} type="button" onClick={() => openModal("pipeline")}>
              <PlusIcon />
              <span>New pipeline</span>
            </button>
          </div>
        </section>

        {status.error ? <p className={styles.error}>{status.error}</p> : null}
        {status.success ? <p className={styles.success}>{status.success}</p> : null}

        {!status.loading && !pipelines.length ? (
          <section className={styles.emptyPanel}>
            <span className={styles.emptyIcon}>
              <PipelineIcon />
            </span>
            <strong>No pipelines yet</strong>
            <p>Create your first pipeline to start organizing deals into a custom stage flow.</p>
            <button className={styles.primaryButton} type="button" onClick={() => openModal("pipeline")}>
              <PlusIcon />
              <span>Create pipeline</span>
            </button>
          </section>
        ) : (
          <section className={styles.boardSection}>
            <div className={styles.boardHeader}>
              <div>
                <p className={styles.boardEyebrow}>Pipeline view</p>
                <h2>{selectedPipeline?.name || "Pipeline"}</h2>
              </div>
              <button className={styles.secondaryButton} type="button" onClick={() => openModal("status")} disabled={!selectedPipeline}>
                <PlusIcon />
                <span>Add status</span>
              </button>
            </div>

            {status.loading ? (
              <div className={styles.emptyPanel}>
                <span className={styles.emptyIcon}>
                  <ClipboardIcon />
                </span>
                <strong>Loading pipeline</strong>
                <p>Please wait while we load your workflow.</p>
              </div>
            ) : selectedPipeline ? (
              <div className={styles.boardScroller}>
                <div className={styles.board}>
                  {visibleStatuses.map((statusItem, index) => (
                    <article
                      key={statusItem.id}
                      className={`${styles.column} ${dragState.draggingId === statusItem.id ? styles.columnDragging : ""}`}
                      draggable
                      onDragStart={() => {
                        dragCommittedRef.current = false;
                        setDragState({ draggingId: statusItem.id, previewStatuses: visibleStatuses });
                      }}
                      onDragEnd={() => {
                        if (dragCommittedRef.current) {
                          dragCommittedRef.current = false;
                          return;
                        }
                        setDragState({ draggingId: null, previewStatuses: null });
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (!dragState.draggingId || dragState.draggingId === statusItem.id) {
                          return;
                        }
                        setDragState((current) => ({
                          ...current,
                          previewStatuses: reorderStatuses(current.previewStatuses || visibleStatuses, current.draggingId, index),
                        }));
                      }}
                      onDrop={async (event) => {
                        event.preventDefault();
                        if (dragState.draggingId === null) {
                          return;
                        }
                        const draggingId = dragState.draggingId;
                        const previewIndex = (dragState.previewStatuses || visibleStatuses).findIndex((item) => item.id === draggingId);
                        dragCommittedRef.current = true;
                        setDragState({ draggingId: null, previewStatuses: null });
                        await moveStatusToPosition(draggingId, previewIndex);
                      }}
                    >
                      <div className={styles.columnHeader}>
                        <div className={styles.columnLead}>
                          <span className={styles.stageMarker} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                          <div>
                            {editingStatusId === statusItem.id ? (
                              <div className={styles.inlineEditRow}>
                                <input
                                  className={styles.inlineEditInput}
                                  value={editingName}
                                  onChange={(event) => setEditingName(event.target.value)}
                                  onKeyDown={async (event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      await saveStatusName(statusItem.id);
                                    }
                                    if (event.key === "Escape") {
                                      cancelStatusEditing();
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  className={styles.inlineSaveButton}
                                  type="button"
                                  onClick={() => saveStatusName(statusItem.id)}
                                  aria-label={`Save ${statusItem.name}`}
                                  title="Save status"
                                >
                                  <CheckIcon />
                                </button>
                              </div>
                            ) : (
                              <button className={styles.inlineTitleButton} type="button" onClick={() => startStatusEditing(statusItem)}>
                                <span className={styles.columnTitle}>{statusItem.name}</span>
                              </button>
                            )}
                            <StageBadge count={0} />
                          </div>
                        </div>
                        <div className={styles.columnActions}>
                          <button
                            className={styles.deleteAction}
                            type="button"
                            onClick={() => openModal("delete-status", statusItem)}
                            aria-label={`Remove ${statusItem.name}`}
                            title="Remove status"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      <div className={styles.columnBody}>
                        <div className={styles.columnContent}>
                          <div className={styles.columnEmpty}>
                          <span className={styles.columnEmptyIcon}>
                            <ClipboardIcon />
                          </span>
                          <strong>No deals in this stage</strong>
                          <p>New opportunities in {statusItem.name.toLowerCase()} will appear here.</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}

                  <button className={styles.addColumnCard} type="button" onClick={() => openModal("status")} disabled={!selectedPipeline}>
                    <PlusIcon />
                    <span>Add status</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyPanel}>
                <span className={styles.emptyIcon}>
                  <ClipboardIcon />
                </span>
                <strong>Select a pipeline</strong>
                <p>Choose a pipeline to review and arrange its stages.</p>
              </div>
            )}
          </section>
        )}
      </div>

      {modalState.type === "pipeline" ? (
        <PipelineModal
          title="Create pipeline"
          description="Set up a new workflow with its own status columns."
          value={nameValue}
          onChange={setNameValue}
          onClose={closeModal}
          onSubmit={handleCreatePipeline}
          submitLabel="Create pipeline"
          placeholder="Commercial sales"
        />
      ) : null}

      {modalState.type === "status" ? (
        <PipelineModal
          title="Add status"
          description="Add a new status column to the current pipeline."
          value={nameValue}
          onChange={setNameValue}
          onClose={closeModal}
          onSubmit={handleCreateStatus}
          submitLabel="Add status"
          placeholder="Contract review"
        />
      ) : null}

      {modalState.type === "delete-status" ? (
        <ConfirmDeleteModal
          title="Remove status"
          description='Type "Confirm" to remove this status from the pipeline.'
          value={deleteConfirmValue}
          onChange={setDeleteConfirmValue}
          onClose={closeModal}
          onSubmit={handleDeleteStatus}
          submitLabel="Remove status"
        />
      ) : null}
    </DashboardShell>
  );
}
