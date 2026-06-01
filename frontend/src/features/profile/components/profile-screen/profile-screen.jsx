import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { getMyTargetSummary } from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import styles from "./profile-screen.module.css";

function getCurrentQuarterParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    quarter: Math.floor(now.getMonth() / 3) + 1,
  };
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProfileScreen({ user }) {
  const defaults = getCurrentQuarterParts();
  const token = getAccessToken();
  const companyName = user?.companies?.map((company) => company.name).join(", ") || user?.company?.name || "No company assigned";
  const roleLabel =
    user?.roles?.map((role) => role.name).join(", ") || (user?.role || "platform_admin").replaceAll("_", " ");
  const [filters, setFilters] = useState(defaults);
  const [targetSummary, setTargetSummary] = useState(null);

  useEffect(() => {
    let active = true;
    getMyTargetSummary(token, filters)
      .then((summary) => {
        if (!active) {
          return;
        }
        setTargetSummary(summary);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setTargetSummary(null);
      });

    return () => {
      active = false;
    };
  }, [filters, token]);

  return (
    <DashboardShell
      sidebar={<Sidebar user={user} />}
      topbar={<Topbar user={user} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Profile" }]} />}
    >
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

        <section className={styles.targetsCard}>
          <div className={styles.targetsHeader}>
            <div>
              <p className={styles.label}>My target</p>
              <strong className={styles.targetsTitle}>{targetSummary?.quarter_label || `Q${filters.quarter} ${filters.year}`}</strong>
            </div>
            <div className={styles.targetFilters}>
              <select value={filters.quarter} onChange={(event) => setFilters((current) => ({ ...current, quarter: Number(event.target.value) }))}>
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
                <option value={4}>Q4</option>
              </select>
              <select value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}>
                {[defaults.year + 1, defaults.year, defaults.year - 1, defaults.year - 2].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.targetMetrics}>
            <article className={styles.metricPanel}>
              <span>Target</span>
              <strong>{formatCurrency(targetSummary?.totals?.target_value)}</strong>
            </article>
            <article className={styles.metricPanel}>
              <span>Achieved</span>
              <strong>{formatCurrency(targetSummary?.totals?.achieved_value)}</strong>
            </article>
            <article className={styles.metricPanel}>
              <span>Progress</span>
              <strong>{Math.round(targetSummary?.totals?.progress_percent || 0)}%</strong>
            </article>
          </div>

          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${Math.max(0, Math.min(targetSummary?.totals?.progress_percent || 0, 100))}%` }} />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
