"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { CheckIcon, ClipboardIcon, DealsIcon, PeopleIcon, PipelineIcon, PlusIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  createPipeline,
  createPipelineStatus,
  deletePipeline,
  deletePipelineStatus,
  listContacts,
  listDeals,
  listPipelineMemberships,
  listPipelines,
  updateContact,
  updateDeal,
  updatePipelineMembership,
  deletePipelineMembership,
  updatePipeline,
  updatePipelineStatus,
} from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import { ConfirmDeleteModal, PipelineMemberPermissionsModal, PipelineModal, PipelineTeamModal } from "./pipeline-modal";
import styles from "./pipeline-screen.module.css";

const DEFAULT_STATUS_COLOR = "#7C5F35";
const PIPELINE_TABS = [
  { id: "contacts", label: "Contacts", icon: PeopleIcon },
  { id: "deals", label: "Projects", icon: DealsIcon },
];

function getPipelineStorageKey(user, kind) {
  const companyId = user?.company?.id || user?.companies?.[0]?.id || "default";
  return `crm:last-pipeline:${companyId}:${kind}`;
}

function readStoredPipelineId(user, kind) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getPipelineStorageKey(user, kind)) || "";
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

function formatAmount(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function StageBadge({ count }) {
  return <span className={styles.stageCount}>{count}</span>;
}

function uniqueTeamUsers(pipelines) {
  const seen = new Set();
  const users = [];
  for (const pipeline of pipelines || []) {
    for (const member of pipeline.team || []) {
      if (seen.has(member.id)) {
        continue;
      }
      seen.add(member.id);
      users.push(member);
    }
  }
  return users;
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

function getTabCopy(activeTab) {
  if (activeTab === "deals") {
    return {
      eyebrow: "Pipeline",
      title: "Manage project stages separately from contact tracking",
      copy: "Create project-specific pipelines, move opportunities between stages, and keep every stage column aligned with your project flow.",
      emptyTitle: "No project pipelines yet",
      emptyCopy: "Create your first projects pipeline to start organizing opportunities by stage.",
      boardEyebrow: "Projects pipeline",
      addStatusLabel: "Add stage",
      createPipelinePlaceholder: "Cairo Tenders",
      createPipelineDescription: "Set up a new projects workflow with its own stage columns.",
      editPipelineDescription: "Rename this projects pipeline without changing the opportunities already assigned to it.",
      deletePipelineDescription:
        "Type Confirm to permanently delete this projects pipeline. Projects must be moved or deleted before the pipeline can be removed.",
      emptyColumnCopy: (statusName) => `Projects assigned to ${statusName.toLowerCase()} will appear here.`,
    };
  }

  return {
    eyebrow: "Pipeline",
    title: "Shape each workflow around your contact sales motion",
    copy: "Switch between contact pipelines, create new stage flows, and keep every stage column in the right order.",
    emptyTitle: "No contact pipelines yet",
    emptyCopy: "Create your first contacts pipeline to start organizing people by stage.",
    boardEyebrow: "Contacts pipeline",
    addStatusLabel: "Add stage",
    createPipelinePlaceholder: "Consultant Outreach",
    createPipelineDescription: "Set up a new contacts workflow with its own stage columns.",
    editPipelineDescription: "Rename this contacts pipeline without changing the people already assigned to it.",
    deletePipelineDescription:
      "Type Confirm to permanently delete this contacts pipeline. Contacts will remain in the Contacts page, but their pipeline and stage will be cleared.",
    emptyColumnCopy: (statusName) => `Contacts assigned to ${statusName.toLowerCase()} will appear here.`,
  };
}

export function PipelineScreen({ user }) {
  const token = getAccessToken();
  const dragCommittedRef = useRef(false);
  const [activeTab, setActiveTab] = useState("contacts");
  const [pipelines, setPipelines] = useState([]);
  const [pipelineContacts, setPipelineContacts] = useState([]);
  const [pipelineDeals, setPipelineDeals] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [status, setStatus] = useState({ loading: true, error: "", success: "" });
  const [modalState, setModalState] = useState({ type: null, statusId: null });
  const [nameValue, setNameValue] = useState("");
  const [colorValue, setColorValue] = useState(DEFAULT_STATUS_COLOR);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [dragState, setDragState] = useState({ draggingId: null, previewStatuses: null });
  const [draggingCardId, setDraggingCardId] = useState(null);
  const [dropStatusId, setDropStatusId] = useState(null);
  const [teamState, setTeamState] = useState({
    open: false,
    loading: false,
    memberships: [],
    membershipSavingId: null,
    membershipRemovingId: null,
    editingMembershipId: null,
    editForm: null,
  });

  const copy = getTabCopy(activeTab);
  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => String(pipeline.id) === selectedPipelineId) || null,
    [pipelines, selectedPipelineId],
  );
  const selectedPipelineAccess = selectedPipeline?.access || null;
  const selectedPipelineTeam = selectedPipeline?.team || [];
  const visibleTopbarTeam = selectedPipeline ? selectedPipelineTeam : uniqueTeamUsers(pipelines);
  const editingMembership = useMemo(
    () => teamState.memberships.find((membership) => membership.id === teamState.editingMembershipId) || null,
    [teamState.editingMembershipId, teamState.memberships],
  );
  const visibleStatuses = useMemo(
    () => dragState.previewStatuses || selectedPipeline?.statuses || [],
    [dragState.previewStatuses, selectedPipeline?.statuses],
  );
  const boardItems = activeTab === "deals" ? pipelineDeals : pipelineContacts;
  const itemsByStatus = useMemo(
    () =>
      visibleStatuses.reduce((groups, statusItem) => {
        groups[statusItem.id] = boardItems.filter((item) => (activeTab === "deals" ? item.stage : item.status) === statusItem.name);
        return groups;
      }, {}),
    [activeTab, boardItems, visibleStatuses],
  );

  async function loadPipelines(nextTab = activeTab, nextSelectedPipelineId = "") {
    setStatus((current) => ({ ...current, loading: true }));

    try {
      const nextPipelines = await listPipelines(token, { kind: nextTab });
      const storedPipelineId = readStoredPipelineId(user, nextTab);
      const resolvedPipelineId =
        nextSelectedPipelineId && nextPipelines.some((pipeline) => String(pipeline.id) === nextSelectedPipelineId)
          ? nextSelectedPipelineId
          : storedPipelineId && nextPipelines.some((pipeline) => String(pipeline.id) === storedPipelineId)
            ? storedPipelineId
            : nextPipelines[0]
              ? String(nextPipelines[0].id)
              : "";

      setPipelines(nextPipelines);
      setSelectedPipelineId(resolvedPipelineId);
      setStatus({ loading: false, error: "", success: "" });
    } catch (error) {
      setPipelines([]);
      setSelectedPipelineId("");
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

  async function loadPipelineDeals(pipelineId) {
    if (!pipelineId) {
      setPipelineDeals([]);
      return;
    }

    const response = normalizePaginatedResponse(await listDeals(token, { page: 1, page_size: 200, pipeline_id: pipelineId }));
    setPipelineDeals(
      response.results.map((deal) => ({
        id: deal.id,
        name: deal.name,
        company: deal.company?.name || "No company",
        contact: deal.contact?.full_name || "",
        amount: deal.amount || 0,
        stage: deal.stage,
        owner: deal.owner?.full_name || "Unassigned",
        expectedCloseDate: deal.expected_close_date || "",
        daysInStage: deal.days_in_stage || 0,
      })),
    );
  }

  useEffect(() => {
    let active = true;

    async function hydratePipelines() {
      setStatus((current) => ({ ...current, loading: true }));

      try {
        const nextPipelines = await listPipelines(token, { kind: activeTab });
        if (!active) {
          return;
        }

        const storedPipelineId = readStoredPipelineId(user, activeTab);
        const resolvedPipelineId =
          storedPipelineId && nextPipelines.some((pipeline) => String(pipeline.id) === storedPipelineId)
            ? storedPipelineId
            : nextPipelines[0]
              ? String(nextPipelines[0].id)
              : "";

        setPipelines(nextPipelines);
        setSelectedPipelineId(resolvedPipelineId);
        setStatus({ loading: false, error: "", success: "" });
      } catch (error) {
        if (!active) {
          return;
        }
        setPipelines([]);
        setSelectedPipelineId("");
        setStatus({ loading: false, error: error.message || "Unable to load pipelines.", success: "" });
      }
    }

    hydratePipelines();

    return () => {
      active = false;
    };
  }, [activeTab, token, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = getPipelineStorageKey(user, activeTab);
    if (selectedPipelineId) {
      window.localStorage.setItem(storageKey, selectedPipelineId);
      return;
    }

    window.localStorage.removeItem(storageKey);
  }, [activeTab, selectedPipelineId, user]);

  useEffect(() => {
    let active = true;

    async function hydrateItems() {
      if (!selectedPipelineId) {
        setPipelineContacts([]);
        setPipelineDeals([]);
        return;
      }

      try {
        if (activeTab === "deals") {
          const response = normalizePaginatedResponse(await listDeals(token, { page: 1, page_size: 200, pipeline_id: selectedPipelineId }));
          if (!active) {
            return;
          }
          setPipelineDeals(
            response.results.map((deal) => ({
              id: deal.id,
              name: deal.name,
              company: deal.company?.name || "No company",
              contact: deal.contact?.full_name || "",
              amount: deal.amount || 0,
              stage: deal.stage,
              owner: deal.owner?.full_name || "Unassigned",
              expectedCloseDate: deal.expected_close_date || "",
              daysInStage: deal.days_in_stage || 0,
            })),
          );
          setPipelineContacts([]);
          return;
        }

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
        setPipelineDeals([]);
      } catch {
        if (!active) {
          return;
        }
        setPipelineContacts([]);
        setPipelineDeals([]);
      }
    }

    hydrateItems();

    return () => {
      active = false;
    };
  }, [activeTab, selectedPipelineId, token]);

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

  async function openTeamModal() {
    if (!selectedPipeline) {
      return;
    }
    setStatus((current) => ({ ...current, error: "" }));
    setTeamState((current) => ({ ...current, open: true, loading: true }));
    try {
      const memberships = await listPipelineMemberships(token, { pipeline_id: selectedPipeline.id });
      setTeamState({
        open: true,
        loading: false,
        memberships: memberships || [],
        membershipSavingId: null,
        membershipRemovingId: null,
        editingMembershipId: null,
        editForm: null,
      });
    } catch (error) {
      setTeamState((current) => ({ ...current, open: false, loading: false }));
      setStatus({ loading: false, error: error.message || "Unable to load pipeline team.", success: "" });
    }
  }

  function closeTeamModal() {
    setTeamState({
      open: false,
      loading: false,
      memberships: [],
      membershipSavingId: null,
      membershipRemovingId: null,
      editingMembershipId: null,
      editForm: null,
    });
  }

  function openTeamMemberEditor(membershipId) {
    const membership = teamState.memberships.find((item) => item.id === membershipId);
    if (!membership) {
      return;
    }

    setTeamState((current) => ({
      ...current,
      open: false,
      editingMembershipId: membershipId,
      editForm: {
        has_full_access: membership.has_full_access,
        can_invite_members: membership.can_invite_members,
        can_edit_pipeline: membership.can_edit_pipeline,
        can_delete_pipeline: membership.can_delete_pipeline,
        can_manage_statuses: membership.can_manage_statuses,
        can_view_contacts: membership.can_view_contacts,
        can_move_contacts: membership.can_move_contacts,
        can_manage_contacts: membership.can_manage_contacts,
        can_view_companies: membership.can_view_companies,
        can_manage_companies: membership.can_manage_companies,
        can_view_deals: membership.can_view_deals,
        can_move_deals: membership.can_move_deals,
        can_manage_deals: membership.can_manage_deals,
      },
    }));
  }

  function closeTeamMemberEditor(reopenTeamModal = true) {
    setTeamState((current) => ({
      ...current,
      open: reopenTeamModal,
      editingMembershipId: null,
      editForm: null,
      membershipSavingId: null,
    }));
  }

  function handleTeamPermissionFormChange(field, checked) {
    setTeamState((current) => {
      if (!current.editForm) {
        return current;
      }

      if (field === "has_full_access") {
        return {
          ...current,
          editForm: {
            ...current.editForm,
            has_full_access: checked,
            can_invite_members: checked ? true : current.editForm.can_invite_members,
            can_edit_pipeline: checked ? true : current.editForm.can_edit_pipeline,
            can_delete_pipeline: checked ? true : current.editForm.can_delete_pipeline,
            can_manage_statuses: checked ? true : current.editForm.can_manage_statuses,
            can_view_contacts: checked ? true : current.editForm.can_view_contacts,
            can_move_contacts: checked ? true : current.editForm.can_move_contacts,
            can_manage_contacts: checked ? true : current.editForm.can_manage_contacts,
            can_view_companies: checked ? true : current.editForm.can_view_companies,
            can_manage_companies: checked ? true : current.editForm.can_manage_companies,
            can_view_deals: checked ? true : current.editForm.can_view_deals,
            can_move_deals: checked ? true : current.editForm.can_move_deals,
            can_manage_deals: checked ? true : current.editForm.can_manage_deals,
          },
        };
      }

      return {
        ...current,
        editForm: {
          ...current.editForm,
          [field]: checked,
        },
      };
    });
  }

  async function handleTeamPermissionSave(event) {
    event.preventDefault();

    if (!editingMembership || !teamState.editForm) {
      return;
    }

    setTeamState((current) => ({ ...current, membershipSavingId: editingMembership.id }));
    setStatus((current) => ({ ...current, error: "", success: "" }));

    try {
      const updated = await updatePipelineMembership(token, editingMembership.id, teamState.editForm);
      setTeamState((current) => ({
        ...current,
        open: true,
        editingMembershipId: null,
        editForm: null,
        membershipSavingId: null,
        memberships: current.memberships.map((item) => (item.id === editingMembership.id ? { ...item, ...updated } : item)),
      }));
      await loadPipelines(activeTab, selectedPipelineId);
      setStatus({ loading: false, error: "", success: "Pipeline team updated." });
    } catch (error) {
      setTeamState((current) => ({ ...current, membershipSavingId: null }));
      setStatus({ loading: false, error: error.message || "Unable to update pipeline team.", success: "" });
    }
  }

  async function handleTeamMembershipRemove(membershipId) {
    setTeamState((current) => ({ ...current, membershipRemovingId: membershipId }));
    setStatus((current) => ({ ...current, error: "", success: "" }));
    try {
      await deletePipelineMembership(token, membershipId);
      setTeamState((current) => ({
        ...current,
        membershipRemovingId: null,
        memberships: current.memberships.filter((item) => item.id !== membershipId),
      }));
      await loadPipelines(activeTab, selectedPipelineId);
      setStatus({ loading: false, error: "", success: "Pipeline member removed." });
    } catch (error) {
      setTeamState((current) => ({ ...current, membershipRemovingId: null }));
      setStatus({ loading: false, error: error.message || "Unable to remove pipeline member.", success: "" });
    }
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
      const created = await createPipeline(token, { name: nameValue.trim(), kind: activeTab });
      await loadPipelines(activeTab, String(created.id));
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
      await loadPipelines(activeTab, selectedPipelineId);
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
      await loadPipelines(activeTab, selectedPipelineId);
      if (activeTab === "deals") {
        await loadPipelineDeals(selectedPipeline.id);
      } else {
        await loadPipelineContacts(selectedPipeline.id);
      }
      setStatus({ loading: false, error: "", success: "Stage added." });
      closeModal();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to add stage.", success: "" });
    }
  }

  async function saveStatusName(statusId) {
    if (!statusId || !editingName.trim()) {
      return;
    }

    try {
      await updatePipelineStatus(token, statusId, { name: editingName.trim() });
      await loadPipelines(activeTab, selectedPipelineId);
      setStatus({ loading: false, error: "", success: "Stage updated." });
      cancelStatusEditing();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to update stage.", success: "" });
    }
  }

  async function handleDeleteStatus(event) {
    event.preventDefault();

    if (!modalState.statusId || deleteConfirmValue.trim() !== "Confirm") {
      return;
    }

    try {
      await deletePipelineStatus(token, modalState.statusId);
      await loadPipelines(activeTab, selectedPipelineId);
      if (selectedPipeline?.id) {
        if (activeTab === "deals") {
          await loadPipelineDeals(selectedPipeline.id);
        } else {
          await loadPipelineContacts(selectedPipeline.id);
        }
      }
      setStatus({ loading: false, error: "", success: "Stage removed." });
      closeModal();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to remove stage.", success: "" });
    }
  }

  async function handleDeletePipeline(event) {
    event.preventDefault();

    if (!selectedPipeline || deleteConfirmValue.trim() !== "Confirm") {
      return;
    }

    try {
      await deletePipeline(token, selectedPipeline.id);
      await loadPipelines(activeTab);
      setPipelineContacts([]);
      setPipelineDeals([]);
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
      await loadPipelines(activeTab, selectedPipelineId);
      setStatus({ loading: false, error: "", success: "Stage order updated." });
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to reorder stage.", success: "" });
    }
  }

  async function moveCardToStatus(cardId, nextStatusName) {
    if (!selectedPipeline) {
      return;
    }

    try {
      if (activeTab === "deals") {
        await updateDeal(token, cardId, { stage: nextStatusName });
        await loadPipelineDeals(selectedPipeline.id);
        setStatus({ loading: false, error: "", success: "Project stage updated." });
        return;
      }

      await updateContact(token, cardId, { pipeline_id: selectedPipeline.id, status: nextStatusName });
      await loadPipelineContacts(selectedPipeline.id);
      setStatus({ loading: false, error: "", success: "Contact stage updated." });
    } catch (error) {
      setStatus({ loading: false, error: error.message || `Unable to move ${activeTab === "deals" ? "project" : "contact"}.`, success: "" });
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
          memberUsers={visibleTopbarTeam}
          onManageTeam={selectedPipeline ? openTeamModal : null}
          manageTeamDisabled={!selectedPipeline || !selectedPipelineAccess?.can_invite_members}
          breadcrumbs={[
            { label: "Workspace", href: "/dashboard" },
            { label: "Pipeline", href: "/pipeline" },
            { label: activeTab === "deals" ? "Projects" : "Contacts" },
            ...(selectedPipeline?.name ? [{ label: selectedPipeline.name }] : []),
          ]}
        />
      }
    >
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className={styles.copy}>{copy.copy}</p>
          </div>
          <div className={styles.heroActions}>
            <div className={styles.tabRow} role="tablist" aria-label="Pipeline type">
              {PIPELINE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <label className={styles.pipelineSelect}>
              <span className={styles.visuallyHidden}>Choose pipeline</span>
              <SearchableSelect
                ariaLabel="Choose pipeline"
                value={selectedPipelineId}
                onValueChange={setSelectedPipelineId}
                options={
                  pipelines.length
                    ? pipelines.map((pipeline) => ({ value: String(pipeline.id), label: pipeline.name }))
                    : [{ value: "", label: "No pipelines yet" }]
                }
                disabled={!pipelines.length}
              />
            </label>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => openModal("pipeline-edit")}
              disabled={!selectedPipeline || !selectedPipelineAccess?.can_edit_pipeline}
            >
              Edit pipeline
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => openModal("pipeline-delete")}
              disabled={!selectedPipeline || !selectedPipelineAccess?.can_delete_pipeline}
            >
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
            <strong>{copy.emptyTitle}</strong>
            <p>{copy.emptyCopy}</p>
            <button className={styles.primaryButton} type="button" onClick={() => openModal("pipeline")}>
              <PlusIcon />
              <span>Create pipeline</span>
            </button>
          </section>
        ) : (
          <section className={styles.boardSection}>
            <div className={styles.boardHeader}>
              <div>
                <p className={styles.boardEyebrow}>{copy.boardEyebrow}</p>
                <h2>{selectedPipeline?.name || "Pipeline"}</h2>
              </div>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => openModal("status")}
                disabled={!selectedPipeline || !selectedPipelineAccess?.can_manage_statuses}
              >
                <PlusIcon />
                <span>{copy.addStatusLabel}</span>
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
                        if (draggingCardId !== null) {
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
                        if (draggingCardId !== null) {
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
                        if (draggingCardId !== null || dragState.draggingId === null) {
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
                                  title="Save stage"
                                >
                                  <CheckIcon />
                                </button>
                              </div>
                            ) : (
                              <button
                                className={styles.inlineTitleButton}
                                type="button"
                                onClick={() => startStatusEditing(statusItem)}
                                disabled={!selectedPipelineAccess?.can_manage_statuses}
                              >
                                <span className={styles.columnTitle}>{statusItem.name}</span>
                              </button>
                            )}
                            <StageBadge count={(itemsByStatus[statusItem.id] || []).length} />
                          </div>
                        </div>
                        <div className={styles.columnActions}>
                            <button
                              className={styles.deleteAction}
                              type="button"
                              onClick={() => openModal("delete-status", statusItem)}
                              disabled={!selectedPipelineAccess?.can_manage_statuses}
                              aria-label={`Remove ${statusItem.name}`}
                              title="Remove stage"
                            >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      <div className={styles.columnBody}>
                        <div className={styles.columnContent}>
                          {(itemsByStatus[statusItem.id] || []).length ? (
                            <div
                              className={`${styles.contactStack} ${dropStatusId === statusItem.id ? styles.contactDropActive : ""}`}
                              onDragOver={(event) => {
                                if (draggingCardId === null) {
                                  return;
                                }
                                event.preventDefault();
                                setDropStatusId(statusItem.id);
                              }}
                              onDragLeave={() => {
                                if (dropStatusId === statusItem.id) {
                                  setDropStatusId(null);
                                }
                              }}
                              onDrop={async (event) => {
                                if (draggingCardId === null) {
                                  return;
                                }
                                event.preventDefault();
                                const cardId = draggingCardId;
                                setDraggingCardId(null);
                                setDropStatusId(null);
                                await moveCardToStatus(cardId, statusItem.name);
                              }}
                            >
                              {(itemsByStatus[statusItem.id] || []).map((item) => (
                                <article
                                  key={item.id}
                                  className={styles.contactCard}
                                  draggable
                                  onDragStart={(event) => {
                                    event.stopPropagation();
                                    setDraggingCardId(item.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingCardId(null);
                                    setDropStatusId(null);
                                  }}
                                >
                                  <div className={styles.contactCardHeader}>
                                    <div className={styles.contactCardMeta}>
                                      <strong>{activeTab === "deals" ? item.name : item.fullName}</strong>
                                      <span>{activeTab === "deals" ? item.company : item.title}</span>
                                    </div>
                                    <div className={styles.contactOwnerDot} title={item.owner}>
                                      {renderOwnerInitials(item.owner)}
                                    </div>
                                  </div>
                                  <p className={styles.contactCompany}>{activeTab === "deals" ? item.contact || "No contact" : item.company}</p>
                                  {activeTab === "deals" ? (
                                    <>
                                      <p className={styles.contactMetaLine}>Amount: {formatAmount(item.amount)}</p>
                                      <p className={styles.contactMetaLine}>
                                        {item.expectedCloseDate ? `Close: ${item.expectedCloseDate}` : `In stage: ${item.daysInStage}d`}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className={styles.contactMetaLine}>{item.email}</p>
                                      <p className={styles.contactMetaLine}>{item.phone}</p>
                                    </>
                                  )}
                                  <label className={styles.contactStatusSelect}>
                                    <span className={styles.visuallyHidden}>Move {activeTab === "deals" ? "project" : "contact"} stage</span>
                                    <SearchableSelect
                                      ariaLabel={`Move ${activeTab === "deals" ? "project" : "contact"} stage`}
                                      value={activeTab === "deals" ? item.stage : item.status}
                                      onValueChange={(value) => moveCardToStatus(item.id, value)}
                                      options={visibleStatuses.map((option) => ({ value: option.name, label: option.name }))}
                                    />
                                  </label>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div
                              className={`${styles.columnEmpty} ${dropStatusId === statusItem.id ? styles.contactDropActive : ""}`}
                              onDragOver={(event) => {
                                if (draggingCardId === null) {
                                  return;
                                }
                                event.preventDefault();
                                setDropStatusId(statusItem.id);
                              }}
                              onDragLeave={() => {
                                if (dropStatusId === statusItem.id) {
                                  setDropStatusId(null);
                                }
                              }}
                              onDrop={async (event) => {
                                if (draggingCardId === null) {
                                  return;
                                }
                                event.preventDefault();
                                const cardId = draggingCardId;
                                setDraggingCardId(null);
                                setDropStatusId(null);
                                await moveCardToStatus(cardId, statusItem.name);
                              }}
                            >
                              <span className={styles.columnEmptyIcon}>
                                <ClipboardIcon />
                              </span>
                              <strong>No {activeTab === "deals" ? "projects" : "contacts"} in this stage</strong>
                              <p>{copy.emptyColumnCopy(statusItem.name)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}

                  <button
                    className={styles.addColumnCard}
                    type="button"
                    onClick={() => openModal("status")}
                    disabled={!selectedPipeline || !selectedPipelineAccess?.can_manage_statuses}
                  >
                    <PlusIcon />
                    <span>Add stage</span>
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
          description={copy.createPipelineDescription}
          value={nameValue}
          colorValue={colorValue}
          onChange={setNameValue}
          onColorChange={setColorValue}
          onClose={closeModal}
          onSubmit={handleCreatePipeline}
          submitLabel="Create pipeline"
          placeholder={copy.createPipelinePlaceholder}
        />
      ) : null}

      {modalState.type === "pipeline-edit" ? (
        <PipelineModal
          title="Edit pipeline"
          description={copy.editPipelineDescription}
          value={nameValue}
          colorValue={colorValue}
          onChange={setNameValue}
          onColorChange={setColorValue}
          onClose={closeModal}
          onSubmit={handleUpdatePipeline}
          submitLabel="Save pipeline"
          placeholder={copy.createPipelinePlaceholder}
        />
      ) : null}

      {modalState.type === "status" ? (
        <PipelineModal
          title="Add stage"
          description="Add a new stage column to the current pipeline and choose the color used across the workspace."
          value={nameValue}
          colorValue={colorValue}
          onChange={setNameValue}
          onColorChange={setColorValue}
          onClose={closeModal}
          onSubmit={handleCreateStatus}
          submitLabel="Add stage"
          placeholder={activeTab === "deals" ? "Negotiation Review" : "Site Visit"}
          showColorField
        />
      ) : null}

      {modalState.type === "pipeline-delete" ? (
        <ConfirmDeleteModal
          title="Delete pipeline"
          description={copy.deletePipelineDescription}
          value={deleteConfirmValue}
          onChange={setDeleteConfirmValue}
          onClose={closeModal}
          onSubmit={handleDeletePipeline}
          submitLabel="Delete pipeline"
        />
      ) : null}

      {modalState.type === "delete-status" ? (
        <ConfirmDeleteModal
          title="Remove stage"
          description='Type "Confirm" to remove this stage from the pipeline.'
          value={deleteConfirmValue}
          onChange={setDeleteConfirmValue}
          onClose={closeModal}
          onSubmit={handleDeleteStatus}
          submitLabel="Remove stage"
        />
      ) : null}

      {teamState.open ? (
        <PipelineTeamModal
          pipelineName={selectedPipeline?.name}
          memberships={teamState.memberships}
          loading={teamState.loading}
          membershipRemovingId={teamState.membershipRemovingId}
          onMembershipEdit={openTeamMemberEditor}
          onMembershipRemove={handleTeamMembershipRemove}
          onClose={closeTeamModal}
        />
      ) : null}

      {editingMembership && teamState.editForm ? (
        <PipelineMemberPermissionsModal
          pipelineName={selectedPipeline?.name}
          membership={editingMembership}
          value={teamState.editForm}
          saving={teamState.membershipSavingId === editingMembership.id}
          onPermissionChange={handleTeamPermissionFormChange}
          onClose={() => closeTeamMemberEditor(true)}
          onSubmit={handleTeamPermissionSave}
        />
      ) : null}

    </DashboardShell>
  );
}
