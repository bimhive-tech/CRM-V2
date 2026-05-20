import Link from "next/link";

import { BellIcon, PlusIcon } from "@/components/dashboard/dashboard-icons";

import styles from "./topbar.module.css";

export function Topbar({ user, title = "Dashboard", breadcrumbs = null, onInvite = null, inviteDisabled = false, inviteLabel = "Invite" }) {
  const companyName = user?.company?.name || user?.companies?.[0]?.name || "No company assigned";
  const crumbItems = breadcrumbs?.length ? breadcrumbs : [{ label: "Workspace" }, { label: title }];

  return (
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
        <button className={styles.inviteButton} type="button" onClick={onInvite || undefined} disabled={!onInvite || inviteDisabled}>
          <PlusIcon />
          <span>{inviteLabel}</span>
        </button>
      </div>
    </div>
  );
}
