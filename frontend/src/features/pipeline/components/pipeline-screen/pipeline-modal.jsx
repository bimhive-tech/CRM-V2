import { useState } from "react";

import { EditIcon, TrashIcon } from "@/components/dashboard/dashboard-icons";

import styles from "./pipeline-screen.module.css";

const PIPELINE_PERMISSION_GROUPS = [
  {
    title: "Overview",
    permissions: [
      ["has_full_access", "Full pipeline access", "Turns on every pipeline permission below for this teammate."],
    ],
  },
  {
    title: "Workspace Control",
    permissions: [
      ["can_invite_members", "Invite members", "Invite teammates to this pipeline and manage their access."],
      ["can_edit_pipeline", "Edit pipeline", "Rename this pipeline and update its core configuration."],
      ["can_delete_pipeline", "Delete pipeline", "Delete this pipeline when the workspace is ready to remove it."],
      ["can_manage_statuses", "Manage statuses", "Create, edit, reorder, and delete pipeline statuses."],
    ],
  },
  {
    title: "Contacts",
    permissions: [
      ["can_view_contacts", "View contacts", "Open and see contacts that belong to this pipeline."],
      ["can_move_contacts", "Move contact cards", "Move contacts between statuses on the board."],
      ["can_manage_contacts", "Create and edit contacts", "Add new contacts and update existing contact details."],
    ],
  },
  {
    title: "CRM Companies",
    permissions: [
      ["can_view_companies", "View companies", "See companies connected to this pipeline."],
      ["can_manage_companies", "Create and edit companies", "Add companies and update company details in this pipeline."],
    ],
  },
  {
    title: "Deals",
    permissions: [
      ["can_view_deals", "View deals", "Open and see deals that belong to this pipeline."],
      ["can_move_deals", "Move deal cards", "Move deals between statuses on the board."],
      ["can_manage_deals", "Create and edit deals", "Add deals and update existing deal details."],
    ],
  },
];

const INVITE_PERMISSION_GROUPS = [
  {
    id: "overview",
    title: "Overview",
    permissions: [
      ["has_full_access", "Full pipeline access", "Turns on every pipeline permission below for the selected pipeline types."],
    ],
  },
  {
    id: "workspace",
    title: "Workspace Control",
    permissions: [
      ["can_invite_members", "Invite members", "Invite teammates to these selected pipelines and manage access."],
      ["can_edit_pipeline", "Edit pipeline", "Rename the selected pipelines and update their core configuration."],
      ["can_delete_pipeline", "Delete pipeline", "Delete the selected pipelines when the workspace is ready."],
      ["can_manage_statuses", "Manage statuses", "Create, edit, reorder, and delete statuses on the selected pipelines."],
    ],
  },
  {
    id: "contacts",
    title: "Contacts",
    permissions: [
      ["can_view_contacts", "View contacts", "Open and see contacts inside the selected contacts pipelines."],
      ["can_move_contacts", "Move contact cards", "Move contacts between statuses in the selected contacts pipelines."],
      ["can_manage_contacts", "Create and edit contacts", "Add contacts and update contact details there."],
    ],
  },
  {
    id: "companies",
    title: "CRM Companies",
    permissions: [
      ["can_view_companies", "View companies", "See companies connected to the selected pipelines."],
      ["can_manage_companies", "Create and edit companies", "Add companies and update company details there."],
    ],
  },
  {
    id: "deals",
    title: "Deals",
    permissions: [
      ["can_view_deals", "View deals", "Open and see deals inside the selected deals pipelines."],
      ["can_move_deals", "Move deal cards", "Move deals between statuses in the selected deals pipelines."],
      ["can_manage_deals", "Create and edit deals", "Add deals and update deal details there."],
    ],
  },
];

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

function PermissionMatrix({ value, onPermissionChange, disabled = false, groups = PIPELINE_PERMISSION_GROUPS }) {
  return (
    <div className={styles.memberPermissionsWrap}>
      <table className={styles.memberPermissionsTable}>
        <thead>
          <tr>
            <th>Permission</th>
            <th>Access</th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) =>
            group.permissions.map(([field, label, description], index) => (
              <tr key={field}>
                <td className={styles.memberPermissionLabelCell}>
                  {index === 0 ? <span className={styles.permissionGroupLabel}>{group.title}</span> : null}
                  <strong>{label}</strong>
                  <p>{description}</p>
                </td>
                <td className={styles.memberPermissionCell}>
                  <label className={styles.permissionToggle}>
                    <input
                      type="checkbox"
                      checked={field === "has_full_access" ? value.has_full_access : value.has_full_access || value[field]}
                      onChange={(event) => onPermissionChange(field, event.target.checked)}
                      disabled={disabled || (value.has_full_access && field !== "has_full_access")}
                    />
                  </label>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

function MultiSelectDropdown({ label, placeholder, options, selectedValues, onToggle }) {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedValues.length;
  const summary = selectedCount
    ? `${selectedCount} selected`
    : placeholder;

  return (
    <div className={styles.multiSelectField}>
      <span>{label}</span>
      <div className={styles.multiSelectWrap}>
        <button
          className={styles.multiSelectButton}
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <span>{summary}</span>
          <span className={styles.multiSelectChevron}>{open ? "−" : "+"}</span>
        </button>
        {open ? (
          <div className={styles.multiSelectPanel}>
            {options.length ? (
              options.map((option) => (
                <label key={option.id} className={styles.multiSelectOption}>
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(String(option.id))}
                    onChange={() => onToggle(String(option.id))}
                  />
                  <span>{option.name}</span>
                </label>
              ))
            ) : (
              <p className={styles.multiSelectEmpty}>No pipelines available here yet.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  contactPipelines,
  dealPipelines,
  value,
  onUserChange,
  onTogglePipeline,
  onPermissionChange,
  onClose,
  onSubmit,
  loading = false,
}) {
  const hasContactSelection = value.contactPipelineIds.length > 0;
  const hasDealSelection = value.dealPipelineIds.length > 0;
  const hasAnyPipelineSelection = hasContactSelection || hasDealSelection;
  const visibleGroups = INVITE_PERMISSION_GROUPS.filter((group) => {
    if (group.id === "contacts") {
      return hasContactSelection;
    }
    if (group.id === "deals") {
      return hasDealSelection;
    }
    if (group.id === "companies") {
      return hasAnyPipelineSelection;
    }
    return true;
  });

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

          <div className={styles.inviteSelectors}>
            <MultiSelectDropdown
              label="Contacts pipelines"
              placeholder="Choose contacts pipelines"
              options={contactPipelines}
              selectedValues={value.contactPipelineIds}
              onToggle={(pipelineId) => onTogglePipeline("contacts", pipelineId)}
            />
            <MultiSelectDropdown
              label="Deals pipelines"
              placeholder="Choose deals pipelines"
              options={dealPipelines}
              selectedValues={value.dealPipelineIds}
              onToggle={(pipelineId) => onTogglePipeline("deals", pipelineId)}
            />
          </div>

          {hasAnyPipelineSelection ? (
            <div className={styles.assignmentSection}>
              <p className={styles.assignmentTitle}>Permissions</p>
              <PermissionMatrix value={value} onPermissionChange={onPermissionChange} groups={visibleGroups} />
            </div>
          ) : (
            <div className={styles.membersEmptyState}>
              <strong>Select pipelines first</strong>
              <p>Choose one or more contacts or deals pipelines to reveal the relevant permission matrix.</p>
            </div>
          )}

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={loading || !value.userId || (!value.contactPipelineIds.length && !value.dealPipelineIds.length)}
            >
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
  membershipRemovingId = null,
  onMembershipEdit,
  onMembershipRemove,
  onClose,
}) {
  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={`${styles.modal} ${styles.inviteModal}`} role="dialog" aria-modal="true" aria-labelledby="pipeline-team-modal-title">
        <div className={styles.modalHeader}>
          <div>
            <h2 id="pipeline-team-modal-title">Manage Team</h2>
            <p>Review who can access {pipelineName || "this pipeline"}, then open any teammate to edit their pipeline permissions.</p>
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
                <article key={membership.id} className={styles.memberListRow}>
                  <div className={styles.memberIdentity}>
                    <span
                      className={styles.memberAvatarBadge}
                      style={{
                        backgroundColor: `hsl(${hueForName(membership.user.full_name)} 82% 92%)`,
                        color: `hsl(${hueForName(membership.user.full_name)} 42% 32%)`,
                      }}
                    >
                      {initialsForName(membership.user.full_name)}
                    </span>
                    <div className={styles.memberCopy}>
                      <strong>{membership.user.full_name}</strong>
                      <p className={styles.memberRoleLine}>
                        {membership.user.role_labels?.length ? membership.user.role_labels.join(", ") : "User"}
                      </p>
                      <p>{membership.user.email}</p>
                    </div>
                  </div>
                  <div className={styles.memberActions}>
                    <button
                      className={styles.memberActionButton}
                      type="button"
                      onClick={() => onMembershipEdit(membership.id)}
                      disabled={membershipRemovingId === membership.id}
                      aria-label={`Edit ${membership.user.full_name}`}
                      title="Edit permissions"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className={`${styles.memberActionButton} ${styles.memberActionButtonDanger}`}
                      type="button"
                      onClick={() => onMembershipRemove(membership.id)}
                      disabled={membershipRemovingId === membership.id}
                      aria-label={`Remove ${membership.user.full_name}`}
                      title="Remove from pipeline"
                    >
                      <TrashIcon />
                    </button>
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

export function PipelineMemberPermissionsModal({
  pipelineName,
  membership,
  value,
  saving = false,
  onPermissionChange,
  onClose,
  onSubmit,
}) {
  if (!membership) {
    return null;
  }

  const memberHue = hueForName(membership.user.full_name);

  return (
    <div className={styles.modalOverlay} role="presentation">
      <div className={`${styles.modal} ${styles.inviteModal}`} role="dialog" aria-modal="true" aria-labelledby="pipeline-member-permissions-modal-title">
        <div className={styles.modalHeader}>
          <div>
            <h2 id="pipeline-member-permissions-modal-title">Edit Team Permissions</h2>
            <p>Update what {membership.user.full_name} can do inside {pipelineName || "this pipeline"}.</p>
          </div>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close modal">
            x
          </button>
        </div>
        <form className={styles.modalBody} onSubmit={onSubmit}>
          <div className={styles.memberEditorIdentity}>
            <span
              className={styles.memberAvatarBadge}
              style={{
                backgroundColor: `hsl(${memberHue} 82% 92%)`,
                color: `hsl(${memberHue} 42% 32%)`,
              }}
            >
              {initialsForName(membership.user.full_name)}
            </span>
            <div className={styles.memberCopy}>
              <strong>{membership.user.full_name}</strong>
              <p className={styles.memberRoleLine}>
                {membership.user.role_labels?.length ? membership.user.role_labels.join(", ") : "User"}
              </p>
              <p>{membership.user.email}</p>
            </div>
          </div>

          <PermissionMatrix value={value} onPermissionChange={onPermissionChange} disabled={saving} />

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save permissions"}
            </button>
          </div>
        </form>
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
