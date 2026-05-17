import { ArrowUpIcon } from "@/components/dashboard/dashboard-icons";

import styles from "./metric-card.module.css";

export function MetricCard({ label, value, helper, icon, trend = "neutral" }) {
  return (
    <article className={styles.card}>
      <div className={styles.iconWrap}>{icon}</div>
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <div className={styles.valueRow}>
          <strong className={styles.value}>{value}</strong>
          {trend !== "neutral" ? (
            <span className={`${styles.trend} ${trend === "up" ? styles.trendUp : styles.trendDown}`}>
              <ArrowUpIcon />
            </span>
          ) : null}
        </div>
        <p className={styles.helper}>{helper}</p>
      </div>
    </article>
  );
}
