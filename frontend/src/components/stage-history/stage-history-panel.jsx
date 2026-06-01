import styles from "./stage-history-panel.module.css";

function formatDateTime(value) {
  if (!value) {
    return "In progress";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function StageHistoryPanel({ title, description = "", groups = [] }) {
  const visibleGroups = groups.filter((group) => group?.entries?.length);

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Stage history</p>
        <h3 className={styles.title}>{title}</h3>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>

      {visibleGroups.length ? (
        <div className={styles.groupList}>
          {visibleGroups.map((group) => (
            <div key={group.id || group.label} className={styles.group}>
              {group.label ? <p className={styles.groupLabel}>{group.label}</p> : null}
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <span>Stage</span>
                  <span>Start</span>
                  <span>End</span>
                  <span>Duration</span>
                </div>
                {group.entries.map((entry, index) => (
                  <div key={`${group.id || group.label}-${entry.stage}-${index}`} className={styles.row}>
                    <div className={styles.stageCell}>
                      <span className={styles.stageDot} style={{ background: entry.stage_color || "#7C5F35" }} />
                      <span className={styles.stageName}>{entry.stage || "No stage"}</span>
                      {entry.is_current ? <span className={styles.currentBadge}>Current</span> : null}
                    </div>
                    <span className={styles.cellValue}>{formatDateTime(entry.started_at)}</span>
                    <span className={styles.cellValue}>{formatDateTime(entry.ended_at)}</span>
                    <span className={styles.cellValue}>{entry.duration_label || "0m"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Stage timing will appear here once this record moves through a pipeline.</p>
      )}
    </section>
  );
}
