import { BellIcon, PlusIcon } from "@/components/dashboard/dashboard-icons";

import styles from "./topbar.module.css";

export function Topbar({ user }) {
  const companyName = user?.company?.name || user?.companies?.[0]?.name || "No company assigned";

  return (
    <div className={styles.topbar}>
      <div className={styles.crumbs}>
        <span>Workspace</span>
        <span className={styles.separator}>/</span>
        <strong>Dashboard</strong>
      </div>

      <div className={styles.actions}>
        <button className={styles.iconButton} type="button" aria-label="Notifications">
          <BellIcon />
        </button>
        <div className={styles.identity}>
          <span>{companyName}</span>
        </div>
        <button className={styles.inviteButton} type="button">
          <PlusIcon />
          <span>Invite</span>
        </button>
      </div>
    </div>
  );
}
