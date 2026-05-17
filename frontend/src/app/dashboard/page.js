"use client";

import { DashboardScreen } from "@/features/dashboard/components/dashboard-screen/dashboard-screen";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import styles from "./page.module.css";

export default function DashboardPage() {
  const state = useAuthenticatedUser();

  if (state.loading) {
    return (
      <main className={styles.page}>
        <div className={styles.panel}>Loading workspace…</div>
      </main>
    );
  }

  if (!state.user) {
    return null;
  }

  return (
    <main className={styles.page}>
      <DashboardScreen user={state.user} />
    </main>
  );
}
