"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BellIcon, PlusIcon } from "@/components/dashboard/dashboard-icons";
import {
  assignPipelineMemberships,
  listPipelineInviteOptions,
  listUsers,
} from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";
import { NoticeModal, PipelineInviteModal } from "@/features/pipeline/components/pipeline-screen/pipeline-modal";

import styles from "./topbar.module.css";

const inviteInitialState = {
  userId: "",
  pipelineIds: [],
  has_full_access: false,
  can_invite_members: false,
  can_edit_pipeline: false,
  can_delete_pipeline: false,
  can_manage_statuses: false,
  can_view_contacts: false,
  can_move_contacts: false,
  can_manage_contacts: false,
  can_view_companies: false,
  can_manage_companies: false,
  can_view_deals: false,
  can_move_deals: false,
  can_manage_deals: false,
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

function initialsForName(name) {
  return (
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function hueForName(name) {
  return (name || "user").split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360;
}

export function Topbar({
  user,
  title = "Dashboard",
  breadcrumbs = null,
  onInvite = null,
  inviteDisabled = false,
  inviteLabel = "Invite",
  memberUsers = null,
  onManageTeam = null,
  manageTeamDisabled = false,
}) {
  const token = getAccessToken();
  const crumbItems = breadcrumbs?.length ? breadcrumbs : [{ label: "Workspace" }, { label: title }];
  const canManagePipelineMembers = hasPermission(user, "pipelines.manage_members");
  const companyIds = useMemo(
    () => new Set([user?.company?.id, ...(user?.companies || []).map((company) => company.id)].filter(Boolean)),
    [user],
  );
  const [companyUsers, setCompanyUsers] = useState([]);
  const [inviteState, setInviteState] = useState({
    open: false,
    loading: false,
    users: [],
    pipelines: [],
    accessiblePipelineCount: 0,
    form: inviteInitialState,
  });
  const [noticeState, setNoticeState] = useState({ open: false, title: "", description: "" });

  useEffect(() => {
    if (Array.isArray(memberUsers)) {
      return;
    }

    let active = true;
    if (!companyIds.size) {
      return;
    }

    listUsers(token)
      .then((users) => {
        if (!active) {
          return;
        }
        const nextUsers = (users || []).filter((candidate) => {
          const candidateCompanyIds = new Set([
            candidate.company?.id,
            ...(candidate.companies || []).map((company) => company.id),
          ].filter(Boolean));
          return [...candidateCompanyIds].some((companyId) => companyIds.has(companyId));
        });
        setCompanyUsers(nextUsers);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setCompanyUsers([]);
      });

    return () => {
      active = false;
    };
  }, [companyIds, memberUsers, token]);

  function closeInviteModal() {
    setInviteState({
      open: false,
      loading: false,
      users: [],
      pipelines: [],
      accessiblePipelineCount: 0,
      form: inviteInitialState,
    });
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

      setInviteState({
        open: true,
        loading: false,
        users: options.users || [],
        pipelines: options.pipelines || [],
        accessiblePipelineCount: options.accessible_pipeline_count || 0,
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
    if (field === "has_full_access") {
      setInviteState((current) => ({
        ...current,
        form: {
          ...current.form,
          has_full_access: checked,
          can_invite_members: checked ? true : current.form.can_invite_members,
          can_edit_pipeline: checked ? true : current.form.can_edit_pipeline,
          can_delete_pipeline: checked ? true : current.form.can_delete_pipeline,
          can_manage_statuses: checked ? true : current.form.can_manage_statuses,
          can_view_contacts: checked ? true : current.form.can_view_contacts,
          can_move_contacts: checked ? true : current.form.can_move_contacts,
          can_manage_contacts: checked ? true : current.form.can_manage_contacts,
          can_view_companies: checked ? true : current.form.can_view_companies,
          can_manage_companies: checked ? true : current.form.can_manage_companies,
          can_view_deals: checked ? true : current.form.can_view_deals,
          can_move_deals: checked ? true : current.form.can_move_deals,
          can_manage_deals: checked ? true : current.form.can_manage_deals,
        },
      }));
      return;
    }

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
        has_full_access: inviteState.form.has_full_access,
        can_invite_members: inviteState.form.can_invite_members,
        can_edit_pipeline: inviteState.form.can_edit_pipeline,
        can_delete_pipeline: inviteState.form.can_delete_pipeline,
        can_manage_statuses: inviteState.form.can_manage_statuses,
        can_view_contacts: inviteState.form.can_view_contacts,
        can_move_contacts: inviteState.form.can_move_contacts,
        can_manage_contacts: inviteState.form.can_manage_contacts,
        can_view_companies: inviteState.form.can_view_companies,
        can_manage_companies: inviteState.form.can_manage_companies,
        can_view_deals: inviteState.form.can_view_deals,
        can_move_deals: inviteState.form.can_move_deals,
        can_manage_deals: inviteState.form.can_manage_deals,
      });
      setInviteState((current) => ({
        ...current,
        loading: false,
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

  function closeNoticeModal() {
    setNoticeState({ open: false, title: "", description: "" });
  }

  const resolvedInviteHandler = onInvite || openGlobalInviteModal;
  const resolvedInviteDisabled = onInvite ? inviteDisabled : !canManagePipelineMembers;
  const visibleMemberUsers = Array.isArray(memberUsers) ? memberUsers : companyIds.size ? companyUsers : [];

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
          {onManageTeam ? (
            <button className={styles.teamButton} type="button" onClick={onManageTeam} disabled={manageTeamDisabled}>
              Manage team
            </button>
          ) : null}
          <button className={styles.iconButton} type="button" aria-label="Notifications">
            <BellIcon />
          </button>
          {visibleMemberUsers.length ? (
            <div className={styles.memberStack}>
              {visibleMemberUsers.slice(0, 5).map((member) => {
                const hue = hueForName(member.full_name);
                return (
                  <span
                    key={member.id}
                    className={styles.memberAvatar}
                    title={member.full_name}
                    style={{
                      background: `oklch(0.91 0.07 ${hue})`,
                      color: `oklch(0.42 0.11 ${hue})`,
                    }}
                  >
                    {initialsForName(member.full_name)}
                  </span>
                );
              })}
            </div>
          ) : null}
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
          value={inviteState.form}
          loading={inviteState.loading}
          onUserChange={updateInviteUser}
          onTogglePipeline={toggleInvitePipeline}
          onPermissionChange={updateInvitePermission}
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
