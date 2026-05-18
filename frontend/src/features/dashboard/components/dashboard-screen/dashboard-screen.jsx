import { DataPanel } from "@/components/dashboard/data-panel/data-panel";
import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { AnalyticsIcon, OverviewIcon, PeopleIcon, SheetIcon } from "@/components/dashboard/dashboard-icons";
import { MetricCard } from "@/components/dashboard/metric-card/metric-card";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";

import styles from "./dashboard-screen.module.css";

export function DashboardScreen({ user }) {
  const todayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date());

  return (
    <DashboardShell sidebar={<Sidebar user={user} />} topbar={<Topbar user={user} title="Dashboard" />}>
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{todayLabel}</p>
            <h1>Good morning, {user.full_name.split(" ")[0]}</h1>
            <p className={styles.copy}>Keep an eye on your pipeline, team activity, and the deals that need attention first.</p>
          </div>
          <div className={styles.heroActions}>
            <button type="button" className={styles.secondaryButton}>
              This quarter
            </button>
            <button type="button" className={styles.primaryButton}>
              New deal
            </button>
          </div>
        </section>

        <section className={styles.metrics}>
          <MetricCard label="Open Pipeline" value="$0" helper="waiting for real deals" icon={<OverviewIcon />} />
          <MetricCard label="Weighted Forecast" value="$0" helper="probability-adjusted" icon={<AnalyticsIcon />} />
          <MetricCard label="Closed Won (MTD)" value="$0" helper="vs last month" icon={<SheetIcon />} />
          <MetricCard label="Avg Cycle" value="0d" helper="will calculate from real deals" icon={<PeopleIcon />} />
        </section>

        <section className={styles.panels}>
          <DataPanel
            title="Weighted Pipeline - Last 12 weeks"
            actionLabel="12w"
            emptyTitle="No revenue trend yet"
            emptyCopy="Your pipeline trend will appear here as deals move through each stage."
          />
          <DataPanel
            title="Quota Attainment"
            emptyTitle="No quota data yet"
            emptyCopy="Quota progress will appear here once goals and deal activity are in place."
          />
          <DataPanel
            title="Highest-value deals to close"
            actionLabel="View pipeline"
            emptyTitle="No deals yet"
            emptyCopy="Your highest-value opportunities will appear here as new deals are added."
          />
          <DataPanel
            title="Recent activity"
            actionLabel="All"
            emptyTitle="No activity yet"
            emptyCopy="Calls, notes, meetings, and other updates will appear here as your team starts working."
          />
        </section>
      </div>
    </DashboardShell>
  );
}
