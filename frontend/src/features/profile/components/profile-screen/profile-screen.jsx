import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { getTargetSummary, listCurrencies } from "@/lib/api/admin";
import { getAccessToken } from "@/lib/session";

import styles from "./profile-screen.module.css";

function getCurrentQuarterParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    quarter: Math.floor(now.getMonth() / 3) + 1,
  };
}

function formatCurrency(symbol, value) {
  const amount = Number(value || 0);
  return `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function ProfileScreen({ currentUser, profileUser }) {
  const defaults = getCurrentQuarterParts();
  const token = getAccessToken();
  const viewedUser = profileUser || currentUser;
  const companyName =
    viewedUser?.companies?.map((company) => company.name).join(", ") || viewedUser?.company?.name || "No company assigned";
  const roleLabel =
    viewedUser?.roles?.map((role) => role.name).join(", ") || (viewedUser?.role || "platform_admin").replaceAll("_", " ");
  const selectedCompanyId = viewedUser?.company?.id || viewedUser?.companies?.[0]?.id || currentUser?.company?.id || "";
  const [filters, setFilters] = useState(defaults);
  const [targetSummary, setTargetSummary] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState("EGP");

  useEffect(() => {
    if (!selectedCompanyId || !viewedUser?.id) {
      return;
    }

    let active = true;
    Promise.all([
      getTargetSummary(token, { ...filters, company_id: selectedCompanyId }),
      listCurrencies(token, { company_id: selectedCompanyId }),
    ])
      .then(([summary, currencies]) => {
        if (!active) {
          return;
        }
        const summaryRow = summary?.users?.find((item) => item.user?.id === viewedUser.id) || null;
        const defaultCurrency = currencies.find((currency) => currency.is_default) || currencies[0];
        setCurrencySymbol(defaultCurrency?.symbol || "EGP");
        setTargetSummary(
          summaryRow
            ? {
                quarter_label: summary?.quarter_label,
                totals: {
                  target_value: summaryRow.target_value,
                  achieved_value: summaryRow.achieved_value,
                  progress_percent: summaryRow.progress_percent,
                },
              }
            : {
                quarter_label: summary?.quarter_label,
                totals: {
                  target_value: 0,
                  achieved_value: 0,
                  progress_percent: 0,
                },
              },
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setTargetSummary(null);
        setCurrencySymbol("EGP");
      });

    return () => {
      active = false;
    };
  }, [filters, selectedCompanyId, token, viewedUser?.id]);

  return (
    <DashboardShell
      sidebar={<Sidebar user={currentUser} />}
      topbar={<Topbar user={currentUser} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Profile" }]} />}
    >
      <div className={styles.stack}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Profile</p>
          <h1>{viewedUser?.full_name || "Platform Admin"}</h1>
          <p className={styles.copy}>
            {String(viewedUser?.id) === String(currentUser?.id)
              ? "Your workspace access and account details live here."
              : "Team member access and quarterly target details live here."}
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <p className={styles.label}>Email address</p>
            <strong>{viewedUser?.email || "Not available"}</strong>
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
              <p className={styles.label}>Quarterly target</p>
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
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.targetMetrics}>
            <article className={styles.metricPanel}>
              <span>Target</span>
              <strong>{formatCurrency(currencySymbol, targetSummary?.totals?.target_value)}</strong>
            </article>
            <article className={styles.metricPanel}>
              <span>Achieved</span>
              <strong>{formatCurrency(currencySymbol, targetSummary?.totals?.achieved_value)}</strong>
            </article>
            <article className={styles.metricPanel}>
              <span>Progress</span>
              <strong>{Math.round(targetSummary?.totals?.progress_percent || 0)}%</strong>
            </article>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.max(0, Math.min(targetSummary?.totals?.progress_percent || 0, 100))}%` }}
            />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
