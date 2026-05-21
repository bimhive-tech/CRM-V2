"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarIcon, ClipboardIcon, DealsIcon, MailIcon, OfficeIcon, PeopleIcon, PhoneIcon, PipelineIcon, PlusIcon, SheetIcon } from "@/components/dashboard/dashboard-icons";
import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { listAuditLog, createAuditLogEntry } from "@/lib/api/activity";
import { getAccessToken } from "@/lib/session";

import styles from "./activity-screen.module.css";

const composerTypes = [
  { value: "note", label: "Note" },
  { value: "auth", label: "Auth" },
  { value: "contact", label: "Contact" },
  { value: "deal", label: "Deal" },
  { value: "pipeline", label: "Pipeline" },
  { value: "team", label: "Team" },
];

const iconMap = {
  attachment: { icon: <SheetIcon />, tone: "sand" },
  auth: { icon: <PeopleIcon />, tone: "mint" },
  company: { icon: <OfficeIcon />, tone: "rose" },
  contact: { icon: <PhoneIcon />, tone: "sky" },
  deal: { icon: <DealsIcon />, tone: "amber" },
  import: { icon: <ClipboardIcon />, tone: "mint" },
  note: { icon: <MailIcon />, tone: "rose" },
  pipeline: { icon: <PipelineIcon />, tone: "violet" },
  role: { icon: <PeopleIcon />, tone: "sky" },
  status: { icon: <CalendarIcon />, tone: "violet" },
  team: { icon: <PeopleIcon />, tone: "mint" },
  user: { icon: <PeopleIcon />, tone: "amber" },
};

function formatRelativeTime(value) {
  const date = new Date(value);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) return rtf.format(diffSeconds, "second");
  if (absSeconds < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (absSeconds < 86400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  return rtf.format(Math.round(diffSeconds / 86400), "day");
}

export function ActivityScreen({ user }) {
  const token = getAccessToken();
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState([{ value: "", label: "All types" }]);
  const [eventType, setEventType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ event_type: "note", title: "", description: "" });

  useEffect(() => {
    let active = true;

    listAuditLog(token, { event_type: eventType, page_size: 50 })
      .then((response) => {
        if (!active) return;
        setEntries(response?.results?.results || []);
        setFilters(response?.results?.filters || [{ value: "", label: "All types" }]);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || "Unable to load activity.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventType, token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await createAuditLogEntry(token, form);
      setEntries((current) => [created, ...current]);
      setModalOpen(false);
      setForm({ event_type: "note", title: "", description: "" });
    } catch (requestError) {
      setError(requestError.message || "Unable to log activity.");
    } finally {
      setSaving(false);
    }
  }

  function handleFilterChange(nextValue) {
    setLoading(true);
    setError("");
    setEventType(nextValue);
  }

  const emptyState = useMemo(() => !loading && !entries.length, [entries.length, loading]);

  return (
    <DashboardShell
      sidebar={<Sidebar user={user} />}
      topbar={<Topbar user={user} breadcrumbs={[{ label: "Workspace", href: "/dashboard" }, { label: "Activity" }]} />}
    >
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.title}>Activity</h1>
            <p className={styles.copy}>Everything happening across your workspace, team, and records.</p>
          </div>
          <div className={styles.actions}>
            <label className={styles.filterWrap}>
              <select value={eventType} onChange={(event) => handleFilterChange(event.target.value)} className={styles.select}>
                {filters.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.primaryButton} onClick={() => setModalOpen(true)}>
              <PlusIcon />
              <span>Log activity</span>
            </button>
          </div>
        </section>

        {error ? <div className={styles.error}>{error}</div> : null}

        <section className={styles.feed}>
          {loading ? <div className={styles.placeholder}>Loading activity…</div> : null}
          {emptyState ? (
            <div className={styles.placeholder}>No activity yet. Team changes, imports, notes, and record updates will appear here.</div>
          ) : null}
          {!loading
            ? entries.map((entry) => {
                const visual = iconMap[entry.event_type] || iconMap.note;
                return (
                  <article key={entry.id} className={styles.row}>
                    <div className={`${styles.iconWrap} ${styles[`tone${visual.tone[0].toUpperCase()}${visual.tone.slice(1)}`]}`}>{visual.icon}</div>
                    <div className={styles.rowBody}>
                      <div className={styles.rowHeadline}>
                        <p>
                          <strong>{entry.actor_name}</strong>
                          <span className={styles.muted}> · {entry.title}</span>
                        </p>
                        <time className={styles.time} dateTime={entry.created_at}>
                          {formatRelativeTime(entry.created_at)}
                        </time>
                      </div>
                      <p className={styles.description}>{entry.description || entry.target_label || entry.event_type_label}</p>
                    </div>
                  </article>
                );
              })
            : null}
        </section>
      </div>

      {modalOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setModalOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Log activity" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalEyebrow}>Activity</p>
                <h2>Log activity</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>Type</span>
                <select
                  value={form.event_type}
                  onChange={(event) => setForm((current) => ({ ...current, event_type: event.target.value }))}
                  className={styles.select}
                >
                  {composerTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Title</span>
                <input
                  className={styles.input}
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="What happened?"
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Details</span>
                <textarea
                  className={styles.textarea}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Add the important context."
                  rows={5}
                />
              </label>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? "Saving…" : "Save activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
