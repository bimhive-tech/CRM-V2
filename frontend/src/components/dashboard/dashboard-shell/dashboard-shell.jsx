"use client";

import { cloneElement, isValidElement, useEffect, useState } from "react";

import { MenuIcon } from "@/components/dashboard/dashboard-icons";

import styles from "./dashboard-shell.module.css";

export function DashboardShell({ sidebar, topbar, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 980) {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  const renderedSidebar = isValidElement(sidebar)
    ? cloneElement(sidebar, {
        onNavigate: () => setSidebarOpen(false),
      })
    : sidebar;

  return (
    <main className={styles.page}>
      <div
        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayVisible : ""}`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>{renderedSidebar}</aside>

      <section className={styles.content}>
        <div className={styles.topbarWrap}>
          <button
            className={styles.mobileMenuButton}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </button>
          <div className={styles.topbar}>{topbar}</div>
        </div>
        <div className={styles.body}>{children}</div>
      </section>
    </main>
  );
}
