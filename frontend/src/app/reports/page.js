"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";

import styles from "../dashboard/page.module.css";

function MaintenancePanel({ copy }) {
  return (
    <div className={styles.panel}>
      <h1 style={{ margin: 0, fontSize: "28px", lineHeight: 1.1 }}>Page Under Maintenance</h1>
      <p style={{ margin: "10px 0 0", maxWidth: "560px", lineHeight: 1.6 }}>
        {copy}
      </p>
    </div>
  );
}

export default function ReportsPage() {
  const state = useAuthenticatedUser();

  if (state.loading) {
    return (
      <main className={styles.page}>
        <div className={styles.panel}>Loading workspace...</div>
      </main>
    );
  }

  if (!state.user) {
    return null;
  }

  return (
    <main className={styles.page}>
      <DashboardShell
        sidebar={<Sidebar user={state.user} />}
        topbar={<Topbar user={state.user} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Reports" }]} />}
      >
        <MaintenancePanel
          copy="Reports is currently under maintenance. You can open this page now, and the reporting workspace will land here."
        />
      </DashboardShell>
    </main>
  );
}
