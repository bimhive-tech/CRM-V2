"use client";

import Link from "next/link";
import { useState } from "react";

import { BellIcon, PlusIcon } from "@/components/dashboard/dashboard-icons";
import {
  assignPipelineMemberships,
  deletePipelineMembership,
  listPipelineInviteOptions,
  listPipelineMemberships,
  updatePipelineMembership,
} from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";
import { NoticeModal, PipelineInviteModal } from "@/features/pipeline/components/pipeline-screen/pipeline-modal";

import styles from "./topbar.module.css";

const inviteInitialState = {
  userId: "",
  pipelineIds: [],
  can_invite_members: false,
  can_edit_pipeline: false,
  can_delete_pipeline: false,
  can_manage_statuses: false,
};

function hasPermission(user, permissionCode) {
  if (!user) {
    return false;
  }

  if (user.is_platform_admin) {
    return true;
  }

  return Array.isArray(user.permissions) && user.permissions.includes(permissionCode);
}

export function Topbar({ user, title = "Dashboard", breadcrumbs = null, onInvite = null, inviteDisabled = false, inviteLabel = "Invite" }) {
  const token = getAccessToken();
  const companyName = user?.company?.name || user?.companies?.[0]?.name || "No company assigned";
  const crumbItems = breadcrumbs?.length ? breadcrumbs : [{ label: "Workspace" }, { label: title }];
  const canManagePipelineMembers = hasPermission(user, "pipelines.manage_members");
  const [inviteState, setInviteState] = useState({
    open: false,
    loading: false,
    users: [],
    pipelines: [],
    accessiblePipelineCount: 0,
    managePipelineId: "",
    memberships: [],
    membershipsLoading: false,
    membershipSavingId: null,
    membershipRemovingId: null,
    form: inviteInitialState,
  });
  const [noticeState, setNoticeState] = useState({ open: false, title: "", description: "" });

  function closeInviteModal() {
    setInviteState({
      open: false,
      loading: false,
      users: [],
      pipelines: [],
      accessiblePipelineCount: 0,
      managePipelineId: "",
      memberships: [],
      membershipsLoading: false,
      membershipSavingId: null,
      membershipRemovingId: null,
      form: inviteInitialState,
    });
  }

  async function loadManageMemberships(pipelineId) {
    if (!pipelineId) {
      setInviteState((current) => ({ ...current, memberships: [], membershipsLoading: false }));
      return;
    }

    setInviteState((current) => ({
      ...current,
      managePipelineId: pipelineId,
      membershipsLoading: true,
      memberships: current.managePipelineId === pipelineId ? current.memberships : [],
    }));

    try {
      const memberships = await listPipelineMemberships(token, { pipeline_id: pipelineId });
      setInviteState((current) => ({
        ...current,
        managePipelineId: pipelineId,
        memberships: memberships || [],
        membershipsLoading: false,
      }));
    } catch (error) {
      setInviteState((current) => ({ ...current, membershipsLoading: false }));
      setNoticeState({
        open: true,
        title: "Unable to load pipeline members",
        description: error.message || "Please try again in a moment.",
      });
    }
  }

  async function openGlobalInviteModal() {
    setInviteState((current) => ({ ...current, open: true, loading: true }));
    try {
      const options = await listPipelineInviteOptions(token);
      if (!(options.pipelines || []).length) {
        closeInviteModal();
        if ((options.accessible_pipeline_count || 0) === 0) {
          setNoticeState({
            open: true,
            title: "Create a pipeline first",
            description: "Create at least one pipeline before inviting teammates or managing pipeline members.",
          });
          return;
        }

        setNoticeState({
          open: true,
          title: "No manageable pipelines yet",
          description: "You do not currently have permission to invite or manage members on any pipeline you can access.",
        });
        return;
      }

      const defaultManagePipelineId = String(options.pipelines[0].id);
      const memberships = await listPipelineMemberships(token, { pipeline_id: defaultManagePipelineId });
      setInviteState({
        open: true,
        loading: false,
        users: options.users || [],
        pipelines: options.pipelines || [],
        accessiblePipelineCount: options.accessible_pipeline_count || 0,
        managePipelineId: defaultManagePipelineId,
        memberships: memberships || [],
        membershipsLoading: false,
        membershipSavingId: null,
        membershipRemovingId: null,
        form: inviteInitialState,
      });
    } catch (error) {
      closeInviteModal();
      setNoticeState({
        open: true,
        title: "Unable to open invite",
        description: error.message || "Please try again in a moment.",
      });
    }
  }

  function updateInviteUser(userId) {
    setInviteState((current) => ({
      ...current,
      form: { ...current.form, userId },
    }));
  }

  function toggleInvitePipeline(pipelineId) {
    setInviteState((current) => {
      const nextPipelineIds = current.form.pipelineIds.includes(pipelineId)
        ? current.form.pipelineIds.filter((value) => value !== pipelineId)
        : [...current.form.pipelineIds, pipelineId];
      return {
        ...current,
        form: { ...current.form, pipelineIds: nextPipelineIds },
      };
    });
  }

  function updateInvitePermission(field, checked) {
    setInviteState((current) => ({
      ...current,
      form: { ...current.form, [field]: checked },
    }));
  }

  async function handleInviteSubmit(event) {
    event.preventDefault();
    setInviteState((current) => ({ ...current, loading: true }));

    try {
      await assignPipelineMemberships(token, {
        user_id: Number(inviteState.form.userId),
        pipeline_ids: inviteState.form.pipelineIds.map((id) => Number(id)),
        can_invite_members: inviteState.form.can_invite_members,
        can_edit_pipeline: inviteState.form.can_edit_pipeline,
        can_delete_pipeline: inviteState.form.can_delete_pipeline,
        can_manage_statuses: inviteState.form.can_manage_statuses,
      });
      let nextMemberships = inviteState.memberships;
      if (inviteState.managePipelineId && inviteState.form.pipelineIds.includes(inviteState.managePipelineId)) {
        nextMemberships = await listPipelineMemberships(token, { pipeline_id: inviteState.managePipelineId });
      }
      setInviteState((current) => ({
        ...current,
        loading: false,
        memberships: nextMemberships || [],
        form: inviteInitialState,
      }));
    } catch (error) {
      setInviteState((current) => ({ ...current, loading: false }));
      setNoticeState({
        open: true,
        title: "Unable to send access",
        description: error.message || "Please try again in a moment.",
      });
    }
  }

  async function handleManagePipelineChange(pipelineId) {
    await loadManageMemberships(pipelineId);
  }

  async function handleMembershipPermissionChange(membershipId, field, checked) {
    const membership = inviteState.memberships.find((item) => item.id === membershipId);
    if (!membership) {
      return;
    }

    setInviteState((current) => ({ ...current, membershipSavingId: membershipId }));

    try {
      const updated = await updatePipelineMembership(token, membershipId, {
        can_invite_members: field === "can_invite_members" ? checked : membership.can_invite_members,
        can_edit_pipeline: field === "can_edit_pipeline" ? checked : membership.can_edit_pipeline,
        can_delete_pipeline: field === "can_delete_pipeline" ? checked : membership.can_delete_pipeline,
        can_manage_statuses: field === "can_manage_statuses" ? checked : membership.can_manage_statuses,
      });
      setInviteState((current) => ({
        ...current,
        membershipSavingId: null,
        memberships: current.memberships.map((item) => (item.id === membershipId ? { ...item, ...updated } : item)),
      }));
    } catch (error) {
      setInviteState((current) => ({ ...current, membershipSavingId: null }));
      setNoticeState({
        open: true,
        title: "Unable to update member",
        description: error.message || "Please try again in a moment.",
      });
    }
  }

  async function handleMembershipRemove(membershipId) {
    setInviteState((current) => ({ ...current, membershipRemovingId: membershipId }));

    try {
      await deletePipelineMembership(token, membershipId);
      setInviteState((current) => ({
        ...current,
        membershipRemovingId: null,
        memberships: current.memberships.filter((item) => item.id !== membershipId),
      }));
    } catch (error) {
      setInviteState((current) => ({ ...current, membershipRemovingId: null }));
      setNoticeState({
        open: true,
        title: "Unable to remove member",
        description: error.message || "Please try again in a moment.",
      });
    }
  }

  function closeNoticeModal() {
    setNoticeState({ open: false, title: "", description: "" });
  }

  const resolvedInviteHandler = onInvite || openGlobalInviteModal;
  const resolvedInviteDisabled = onInvite ? inviteDisabled : !canManagePipelineMembers;

  return (
    <>
      <div className={styles.topbar}>
        <div className={styles.crumbs}>
          {crumbItems.map((item, index) => {
            const isLast = index === crumbItems.length - 1;
            return (
              <span key={`${item.label}-${index}`} className={styles.crumbItem}>
                {item.href && !isLast ? (
                  <Link className={styles.crumbLink} href={item.href}>
                    {item.label}
                  </Link>
                ) : isLast ? (
                  <strong>{item.label}</strong>
                ) : (
                  <span>{item.label}</span>
                )}
                {!isLast ? <span className={styles.separator}>&gt;</span> : null}
              </span>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button className={styles.iconButton} type="button" aria-label="Notifications">
            <BellIcon />
          </button>
          <div className={styles.identity}>
            <span>{companyName}</span>
          </div>
          <button className={styles.inviteButton} type="button" onClick={resolvedInviteHandler} disabled={resolvedInviteDisabled}>
            <PlusIcon />
            <span>{inviteLabel}</span>
          </button>
        </div>
      </div>

      {inviteState.open ? (
        <PipelineInviteModal
          users={inviteState.users}
          pipelines={inviteState.pipelines}
          memberships={inviteState.memberships}
          value={inviteState.form}
          managePipelineId={inviteState.managePipelineId}
          loading={inviteState.loading}
          membershipsLoading={inviteState.membershipsLoading}
          membershipSavingId={inviteState.membershipSavingId}
          membershipRemovingId={inviteState.membershipRemovingId}
          onUserChange={updateInviteUser}
          onTogglePipeline={toggleInvitePipeline}
          onPermissionChange={updateInvitePermission}
          onManagePipelineChange={handleManagePipelineChange}
          onMembershipPermissionChange={handleMembershipPermissionChange}
          onMembershipRemove={handleMembershipRemove}
          onClose={closeInviteModal}
          onSubmit={handleInviteSubmit}
        />
      ) : null}

      {noticeState.open ? (
        <NoticeModal
          title={noticeState.title}
          description={noticeState.description}
          actionLabel={noticeState.title === "Create a pipeline first" ? "Create pipeline" : ""}
          onAction={
            noticeState.title === "Create a pipeline first"
              ? () => {
                  closeNoticeModal();
                  window.location.assign("/pipeline");
                }
              : null
          }
          onClose={closeNoticeModal}
        />
      ) : null}
    </>
  );
}
