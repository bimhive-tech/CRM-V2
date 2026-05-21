"use client";

import { ActivityScreen } from "@/features/activity/components/activity-screen/activity-screen";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";

import styles from "../dashboard/page.module.css";

export default function ActivityPage() {
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
      <ActivityScreen user={state.user} />
    </main>
  );
}
