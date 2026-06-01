"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { createQuarterlyTarget, getTargetSummary, listQuarterlyTargets, updateQuarterlyTarget } from "@/lib/api/admin";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";

import styles from "./page.module.css";

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

function clampProgress(value) {
  return Math.max(0, Math.min(Number(value || 0), 100));
}

export default function ReportsPage() {
  const authState = useAuthenticatedUser();
  const token = getAccessToken();
  const defaults = getCurrentQuarterParts();
  const [filters, setFilters] = useState(defaults);
  const [summary, setSummary] = useState(null);
  const [targets, setTargets] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [state, setState] = useState({ loading: true, error: "", success: "" });

  const canManageTargets = Boolean(
    authState.user?.is_platform_admin ||
      authState.user?.is_company_admin ||
      authState.user?.permissions?.includes("users.update"),
  );

  useEffect(() => {
    if (!authState.user) {
      return;
    }

    let active = true;
    setState((current) => ({ ...current, loading: true, error: "", success: "" }));

    Promise.all([
      getTargetSummary(token, filters),
      listQuarterlyTargets(token, filters),
    ])
      .then(([nextSummary, nextTargets]) => {
        if (!active) {
          return;
        }
        setSummary(nextSummary);
        setTargets(nextTargets);
        setState({ loading: false, error: "", success: "" });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setSummary(null);
        setTargets([]);
        setState({ loading: false, error: error.message || "Unable to load targets.", success: "" });
      });

    return () => {
      active = false;
    };
  }, [authState.user, filters, token]);

  if (authState.loading) {
    return null;
  }

  if (!authState.user) {
    return null;
  }

  async function handleTargetSave(userId) {
    const numericValue = Number(editingValue);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      setState((current) => ({ ...current, error: "Please enter a valid non-negative target.", success: "" }));
      return;
    }

    const existing = targets.find((item) => item.user?.id === userId);
    setState((current) => ({ ...current, error: "", success: "" }));

    try {
      if (existing) {
        await updateQuarterlyTarget(token, existing.id, { target_value: numericValue });
      } else {
        await createQuarterlyTarget(token, {
          user_id: userId,
          year: filters.year,
          quarter: filters.quarter,
          target_value: numericValue,
        });
      }
      const [nextSummary, nextTargets] = await Promise.all([
        getTargetSummary(token, filters),
        listQuarterlyTargets(token, filters),
      ]);
      setSummary(nextSummary);
      setTargets(nextTargets);
      setEditingUserId(null);
      setEditingValue("");
      setState({ loading: false, error: "", success: "Target saved." });
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || "Unable to save target.", success: "" }));
    }
  }

  return (
    <main className={styles.page}>
      <DashboardShell
        sidebar={<Sidebar user={authState.user} />}
        topbar={<Topbar user={authState.user} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Reports" }]} />}
      >
        <div className={styles.stack}>
          <section className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Reports</p>
              <h1>Targets</h1>
              <p className={styles.copy}>
                Review the company total for the quarter and each person&apos;s progress in one place.
              </p>
            </div>
            <div className={styles.filters}>
              <label>
                <span>Quarter</span>
                <select value={filters.quarter} onChange={(event) => setFilters((current) => ({ ...current, quarter: Number(event.target.value) }))}>
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </label>
              <label>
                <span>Year</span>
                <select value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))}>
                  {[defaults.year + 1, defaults.year, defaults.year - 1, defaults.year - 2].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {state.error ? <p className={styles.error}>{state.error}</p> : null}
          {state.success ? <p className={styles.success}>{state.success}</p> : null}

          <section className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <span>Total quarterly target</span>
              <strong>{formatCurrency(summary?.totals?.target_value)}</strong>
              <small>{summary?.quarter_label || `Q${filters.quarter} ${filters.year}`}</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Total achieved</span>
              <strong>{formatCurrency(summary?.totals?.achieved_value)}</strong>
              <small>{summary?.totals?.user_count || 0} users in this company</small>
            </article>
            <article className={styles.summaryCard}>
              <span>Quarter progress</span>
              <strong>{Math.round(summary?.totals?.progress_percent || 0)}%</strong>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${clampProgress(summary?.totals?.progress_percent)}%` }} />
              </div>
            </article>
          </section>

          <section className={styles.cardSection}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.sectionEyebrow}>Targets</p>
                <h2>Team progress cards</h2>
              </div>
            </div>

            {state.loading ? (
              <div className={styles.emptyState}>Loading targets...</div>
            ) : summary?.users?.length ? (
              <div className={styles.cardGrid}>
                {summary.users.map((item) => {
                  const isEditing = editingUserId === item.user.id;
                  return (
                    <article key={item.user.id} className={styles.targetCard}>
                      <div className={styles.targetHead}>
                        <div>
                          <strong>{item.user.full_name}</strong>
                          <p>{item.user.email}</p>
                        </div>
                        <span className={styles.badge}>{Math.round(item.progress_percent || 0)}%</span>
                      </div>
                      <div className={styles.metrics}>
                        <div>
                          <span>Target</span>
                          <strong>{formatCurrency(item.target_value)}</strong>
                        </div>
                        <div>
                          <span>Achieved</span>
                          <strong>{formatCurrency(item.achieved_value)}</strong>
                        </div>
                      </div>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${clampProgress(item.progress_percent)}%` }} />
                      </div>

                      {canManageTargets ? (
                        <div className={styles.editor}>
                          {isEditing ? (
                            <>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingValue}
                                onChange={(event) => setEditingValue(event.target.value)}
                                placeholder="Set target"
                              />
                              <button type="button" onClick={() => handleTargetSave(item.user.id)}>Save</button>
                              <button
                                className={styles.secondaryButton}
                                type="button"
                                onClick={() => {
                                  setEditingUserId(null);
                                  setEditingValue("");
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(item.user.id);
                                setEditingValue(String(item.target_value || ""));
                              }}
                            >
                              {Number(item.target_value || 0) > 0 ? "Edit target" : "Set target"}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>No users were found for this company.</div>
            )}
          </section>
        </div>
      </DashboardShell>
    </main>
  );
}
