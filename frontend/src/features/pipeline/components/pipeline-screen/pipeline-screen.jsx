"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { CheckIcon, ClipboardIcon, PipelineIcon, PlusIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { createPipeline, createPipelineStatus, deletePipeline, deletePipelineStatus, listContacts, listPipelines, updateContact, updatePipeline, updatePipelineStatus } from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import { ConfirmDeleteModal, PipelineModal } from "./pipeline-modal";
import styles from "./pipeline-screen.module.css";

const DEFAULT_STATUS_COLOR = "#7C5F35";

function getPipelineStorageKey(user) {
  const companyId = user?.company?.id || user?.companies?.[0]?.id || "default";
  return `crm:last-pipeline:${companyId}`;
}

function readStoredPipelineId(user) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getPipelineStorageKey(user)) || "";
}

function normalizePaginatedResponse(data) {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      results: data,
    };
  }

  return {
    count: data?.count || 0,
    results: data?.results || [],
  };
}

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
  const initialStoredPipelineId = useRef(readStoredPipelineId(user));
  const [pipelines, setPipelines] = useState([]);
  const [pipelineContacts, setPipelineContacts] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const [modalState, setModalState] = useState({ type: null, statusId: null });
  const [nameValue, setNameValue] = useState("");
  const [colorValue, setColorValue] = useState(DEFAULT_STATUS_COLOR);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [dragState, setDragState] = useState({ draggingId: null, previewStatuses: null });
  const [draggingContactId, setDraggingContactId] = useState(null);
  const [contactDropStatusId, setContactDropStatusId] = useState(null);

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === selectedPipelineId) || null,
    [pipelines, selectedPipelineId],
  );
  const visibleStatuses = useMemo(
    () => dragState.previewStatuses || selectedPipeline?.statuses || [],
    [dragState.previewStatuses, selectedPipeline?.statuses],
  );
  const contactsByStatus = useMemo(
    () =>
      visibleStatuses.reduce((groups, statusItem) => {
        groups[statusItem.id] = pipelineContacts.filter((contact) => contact.status === statusItem.name);
        return groups;
      }, {}),
    [pipelineContacts, visibleStatuses],
  );

  async function loadPipelines() {
    setStatus((current) => ({ ...current, loading: true }));

    try {
      const nextPipelines = await listPipelines(token);
      setPipelines(nextPipelines);
      setSelectedPipelineId((current) => {
        if (current && nextPipelines.some((pipeline) => String(pipeline.id) === current)) {
          return current;
        }
        if (initialStoredPipelineId.current && nextPipelines.some((pipeline) => String(pipeline.id) === initialStoredPipelineId.current)) {
          return initialStoredPipelineId.current;
        }
        return nextPipelines[0] ? String(nextPipelines[0].id) : "";
      });
      setStatus({ loading: false, error: "", success: "" });
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to load pipelines.", success: "" });
    }
  }

  async function loadPipelineContacts(pipelineId) {
    if (!pipelineId) {
      setPipelineContacts([]);
      return;
    }

    const response = normalizePaginatedResponse(await listContacts(token, { page: 1, page_size: 200, pipeline_id: pipelineId }));
    setPipelineContacts(
      response.results.map((contact) => ({
        id: contact.id,
        fullName: contact.full_name,
        title: contact.title,
        company: contact.company?.name || "No company",
        email: contact.email || "",
        phone: contact.phone || "",
        status: contact.status,
        owner: contact.owner?.full_name || "Unassigned",
      })),
    );
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
        const nextSelectedPipelineId =
          nextPipelines.find((pipeline) => String(pipeline.id) === initialStoredPipelineId.current)?.id
            ? initialStoredPipelineId.current
            : nextPipelines[0]
              ? String(nextPipelines[0].id)
              : "";
        setSelectedPipelineId(nextSelectedPipelineId);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = getPipelineStorageKey(user);
    if (selectedPipelineId) {
      window.localStorage.setItem(storageKey, selectedPipelineId);
      return;
    }

    window.localStorage.removeItem(storageKey);
  }, [selectedPipelineId, user]);

  useEffect(() => {
    let active = true;

    async function hydrateContacts() {
      if (!selectedPipelineId) {
        setPipelineContacts([]);
        return;
      }

      try {
        const response = normalizePaginatedResponse(await listContacts(token, { page: 1, page_size: 200, pipeline_id: selectedPipelineId }));
        if (!active) {
          return;
        }
        setPipelineContacts(
          response.results.map((contact) => ({
            id: contact.id,
            fullName: contact.full_name,
            title: contact.title,
            company: contact.company?.name || "No company",
            email: contact.email || "",
            phone: contact.phone || "",
            status: contact.status,
            owner: contact.owner?.full_name || "Unassigned",
          })),
        );
      } catch {
        if (!active) {
          return;
        }
        setPipelineContacts([]);
      }
    }

    hydrateContacts();

    return () => {
      active = false;
    };
  }, [selectedPipelineId, token]);

  function openModal(type, statusItem = null) {
    if (type === "pipeline-edit") {
      setNameValue(selectedPipeline?.name || "");
      setColorValue(DEFAULT_STATUS_COLOR);
    } else {
      setNameValue(statusItem?.name || "");
      setColorValue(statusItem?.color || DEFAULT_STATUS_COLOR);
    }
    setDeleteConfirmValue("");
    setModalState({ type, statusId: statusItem?.id || null });
    setStatus((current) => ({ ...current, error: "" }));
  }

  function closeModal() {
    setNameValue("");
    setColorValue(DEFAULT_STATUS_COLOR);
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

  async function handleUpdatePipeline(event) {
    event.preventDefault();

    if (!selectedPipeline) {
      return;
    }

    try {
      await updatePipeline(token, selectedPipeline.id, { name: nameValue.trim() });
      await loadPipelines();
      setStatus({ loading: false, error: "", success: "Pipeline updated." });
      closeModal();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to update pipeline.", success: "" });
    }
  }

  async function handleCreateStatus(event) {
    event.preventDefault();

    if (!selectedPipeline) {
      return;
    }

    try {
      await createPipelineStatus(token, selectedPipeline.id, { name: nameValue.trim(), color: colorValue });
      await Promise.all([loadPipelines(), loadPipelineContacts(selectedPipeline.id)]);
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
      await Promise.all([loadPipelines(), loadPipelineContacts(selectedPipeline?.id)]);
      setStatus({ loading: false, error: "", success: "Status removed." });
      closeModal();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to remove status.", success: "" });
    }
  }

  async function handleDeletePipeline(event) {
    event.preventDefault();

    if (!selectedPipeline || deleteConfirmValue.trim() !== "Confirm") {
      return;
    }

    try {
      await deletePipeline(token, selectedPipeline.id);
      await Promise.all([loadPipelines(), loadPipelineContacts("")]);
      setStatus({ loading: false, error: "", success: "Pipeline removed." });
      closeModal();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to remove pipeline.", success: "" });
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

  async function moveContactToStatus(contactId, nextStatusName) {
    if (!selectedPipeline) {
      return;
    }

    try {
      await updateContact(token, contactId, { pipeline_id: selectedPipeline.id, status: nextStatusName });
      await loadPipelineContacts(selectedPipeline.id);
      setStatus({ loading: false, error: "", success: "Contact stage updated." });
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to move contact.", success: "" });
    }
  }

  function renderOwnerInitials(name) {
    return (
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "U"
    );
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
            <button className={styles.secondaryButton} type="button" onClick={() => openModal("pipeline-edit")} disabled={!selectedPipeline}>
              Edit pipeline
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => openModal("pipeline-delete")} disabled={!selectedPipeline}>
              Delete pipeline
            </button>
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
                        if (draggingContactId !== null) {
                          return;
                        }
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
                        if (draggingContactId !== null) {
                          return;
                        }
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
                        if (draggingContactId !== null) {
                          return;
                        }
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
                            <span style={{ background: statusItem.color || DEFAULT_STATUS_COLOR }} />
                            <span style={{ background: statusItem.color || DEFAULT_STATUS_COLOR }} />
                            <span style={{ background: statusItem.color || DEFAULT_STATUS_COLOR }} />
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
                            <StageBadge count={(contactsByStatus[statusItem.id] || []).length} />
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
                          {(contactsByStatus[statusItem.id] || []).length ? (
                            <div
                              className={`${styles.contactStack} ${contactDropStatusId === statusItem.id ? styles.contactDropActive : ""}`}
                              onDragOver={(event) => {
                                if (draggingContactId === null) {
                                  return;
                                }
                                event.preventDefault();
                                setContactDropStatusId(statusItem.id);
                              }}
                              onDragLeave={() => {
                                if (contactDropStatusId === statusItem.id) {
                                  setContactDropStatusId(null);
                                }
                              }}
                              onDrop={async (event) => {
                                if (draggingContactId === null) {
                                  return;
                                }
                                event.preventDefault();
                                const contactId = draggingContactId;
                                setDraggingContactId(null);
                                setContactDropStatusId(null);
                                await moveContactToStatus(contactId, statusItem.name);
                              }}
                            >
                              {(contactsByStatus[statusItem.id] || []).map((contact) => (
                                <article
                                  key={contact.id}
                                  className={styles.contactCard}
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    setDraggingContactId(contact.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingContactId(null);
                                    setContactDropStatusId(null);
                                  }}
                                >
                                  <div className={styles.contactCardHeader}>
                                    <div className={styles.contactCardMeta}>
                                      <strong>{contact.fullName}</strong>
                                      <span>{contact.title}</span>
                                    </div>
                                    <div className={styles.contactOwnerDot} title={contact.owner}>
                                      {renderOwnerInitials(contact.owner)}
                                    </div>
                                  </div>
                                  <p className={styles.contactCompany}>{contact.company}</p>
                                  <p className={styles.contactMetaLine}>{contact.email}</p>
                                  <p className={styles.contactMetaLine}>{contact.phone}</p>
                                  <label className={styles.contactStatusSelect}>
                                    <span className={styles.visuallyHidden}>Move contact status</span>
                                    <select value={contact.status} onChange={(event) => moveContactToStatus(contact.id, event.target.value)}>
                                      {visibleStatuses.map((option) => (
                                        <option key={option.id} value={option.name}>
                                          {option.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div
                              className={`${styles.columnEmpty} ${contactDropStatusId === statusItem.id ? styles.contactDropActive : ""}`}
                              onDragOver={(event) => {
                                if (draggingContactId === null) {
                                  return;
                                }
                                event.preventDefault();
                                setContactDropStatusId(statusItem.id);
                              }}
                              onDragLeave={() => {
                                if (contactDropStatusId === statusItem.id) {
                                  setContactDropStatusId(null);
                                }
                              }}
                              onDrop={async (event) => {
                                if (draggingContactId === null) {
                                  return;
                                }
                                event.preventDefault();
                                const contactId = draggingContactId;
                                setDraggingContactId(null);
                                setContactDropStatusId(null);
                                await moveContactToStatus(contactId, statusItem.name);
                              }}
                            >
                              <span className={styles.columnEmptyIcon}>
                                <ClipboardIcon />
                              </span>
                              <strong>No contacts in this stage</strong>
                              <p>Contacts assigned to {statusItem.name.toLowerCase()} will appear here.</p>
                            </div>
                          )}
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
          colorValue={colorValue}
          onChange={setNameValue}
          onColorChange={setColorValue}
          onClose={closeModal}
          onSubmit={handleCreatePipeline}
          submitLabel="Create pipeline"
          placeholder="Commercial sales"
        />
      ) : null}

      {modalState.type === "pipeline-edit" ? (
        <PipelineModal
          title="Edit pipeline"
          description="Rename this pipeline without changing the contacts already assigned to it."
          value={nameValue}
          colorValue={colorValue}
          onChange={setNameValue}
          onColorChange={setColorValue}
          onClose={closeModal}
          onSubmit={handleUpdatePipeline}
          submitLabel="Save pipeline"
          placeholder="Commercial sales"
        />
      ) : null}

      {modalState.type === "status" ? (
        <PipelineModal
          title="Add status"
          description="Add a new status column to the current pipeline and choose the color used across the workspace."
          value={nameValue}
          colorValue={colorValue}
          onChange={setNameValue}
          onColorChange={setColorValue}
          onClose={closeModal}
          onSubmit={handleCreateStatus}
          submitLabel="Add status"
          placeholder="Contract review"
          showColorField
        />
      ) : null}

      {modalState.type === "pipeline-delete" ? (
        <ConfirmDeleteModal
          title="Delete pipeline"
          description="Type Confirm to permanently delete this pipeline. This is irreversible. Contacts will remain in the Contacts page, but their pipeline and status will be cleared."
          value={deleteConfirmValue}
          onChange={setDeleteConfirmValue}
          onClose={closeModal}
          onSubmit={handleDeletePipeline}
          submitLabel="Delete pipeline"
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
