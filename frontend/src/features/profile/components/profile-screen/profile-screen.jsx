import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";

import styles from "./profile-screen.module.css";

export function ProfileScreen({ user }) {
  const companyName = user?.companies?.map((company) => company.name).join(", ") || user?.company?.name || "No company assigned";
  const roleLabel =
    user?.roles?.map((role) => role.name).join(", ") || (user?.role || "platform_admin").replaceAll("_", " ");

  return (
    <DashboardShell sidebar={<Sidebar user={user} />} topbar={<Topbar user={user} title="Profile" />}>
      <div className={styles.stack}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Profile</p>
          <h1>{user?.full_name || "Platform Admin"}</h1>
          <p className={styles.copy}>Your workspace access and account details live here.</p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <p className={styles.label}>Email address</p>
            <strong>{user?.email || "Not available"}</strong>
          </article>
          <article className={styles.card}>
            <p className={styles.label}>Company</p>
            <strong>{companyName}</strong>
          </article>
          <article className={styles.card}>
            <p className={styles.label}>Role</p>
            <strong>{roleLabel}</strong>
          </article>
        </section>
      </div>
    </DashboardShell>
  );
}
