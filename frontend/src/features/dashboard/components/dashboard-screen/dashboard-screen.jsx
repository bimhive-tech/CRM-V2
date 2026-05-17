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
    <DashboardShell sidebar={<Sidebar user={user} />} topbar={<Topbar user={user} />}>
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>{todayLabel}</p>
            <h1>Good morning, {user.full_name.split(" ")[0]}</h1>
            <p className={styles.copy}>
              The new CRM V2 workspace now matches the reference layout. Real deals, contacts, activity, and reports
              will appear here once the backend domains are connected.
            </p>
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
            emptyCopy="Weighted pipeline trend will render here after deals and stage probabilities are connected."
          />
          <DataPanel
            title="Quota Attainment"
            emptyTitle="No quota data yet"
            emptyCopy="Rep quota progress will appear here when users, deals, and goals are connected."
          />
          <DataPanel
            title="Highest-value deals to close"
            actionLabel="View pipeline"
            emptyTitle="No deals yet"
            emptyCopy="The most important opportunities will be listed here once deal records are available."
          />
          <DataPanel
            title="Recent activity"
            actionLabel="All"
            emptyTitle="No activity yet"
            emptyCopy="Calls, notes, meetings, and other CRM activity will show here once the app is wired to live data."
          />
        </section>
      </div>
    </DashboardShell>
  );
}
