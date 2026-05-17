"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  ActivityIcon,
  AnalyticsIcon,
  DealsIcon,
  InboxIcon,
  OverviewIcon,
  PipelineIcon,
  PeopleIcon,
  SearchIcon,
  SettingsIcon,
} from "@/components/dashboard/dashboard-icons";
import { clearSession } from "@/lib/session";

import styles from "./sidebar.module.css";

const navSections = [
  {
    title: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <OverviewIcon />, href: "/dashboard", match: ["/dashboard"] },
      { id: "pipeline", label: "Pipeline", icon: <PipelineIcon />, href: "/dashboard" },
      { id: "contacts", label: "Contacts", icon: <PeopleIcon />, href: "/dashboard" },
      { id: "deals", label: "Deals", icon: <DealsIcon />, href: "/dashboard" },
      { id: "activity", label: "Activity", icon: <ActivityIcon />, href: "/dashboard" },
    ],
  },
  {
    title: "Tools",
    items: [
      { id: "inbox", label: "Inbox", icon: <InboxIcon />, href: "/dashboard" },
      { id: "reports", label: "Reports", icon: <AnalyticsIcon />, href: "/dashboard" },
      { id: "settings", label: "Settings", icon: <SettingsIcon />, href: "/settings", match: ["/settings"] },
    ],
  },
];

export function Sidebar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  const companyName = user?.company?.name || user?.companies?.[0]?.name || "No company assigned";
  const roleLabel =
    user?.roles?.length
      ? user.roles.map((role) => role.name).join(", ")
      : (user?.role || "platform_admin").replaceAll("_", " ");
  const userInitials = (user?.full_name || "No User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function handleProfileOpen() {
    setMenuOpen(false);
    router.push("/profile");
  }

  function isItemActive(item) {
    if (item.match?.length) {
      return item.match.includes(pathname);
    }
    return false;
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>CRM</div>
        <div className={styles.brandTitle}>{companyName}</div>
        <div className={styles.brandSubtitle}>CRM</div>
      </div>

      <button className={styles.search} type="button">
        <SearchIcon />
        <span>Quick find</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div className={styles.navWrap}>
        {navSections.map((section) => (
          <section key={section.title} className={styles.section}>
            <p className={styles.sectionTitle}>{section.title}</p>
            <div className={styles.sectionItems}>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`${styles.navItem} ${isItemActive(item) ? styles.navItemActive : ""}`}
                  type="button"
                  onClick={() => router.push(item.href)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className={styles.accountWrap} ref={menuRef}>
        {menuOpen ? (
          <div className={styles.accountMenu}>
            <button type="button" onClick={handleProfileOpen}>
              Profile
            </button>
            <button className={styles.logoutButton} type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : null}

        <button className={styles.userCard} type="button" onClick={() => setMenuOpen((value) => !value)}>
          <span className={styles.avatar}>{userInitials}</span>
          <div className={styles.userMeta}>
            <strong>{user?.full_name || "Platform Admin"}</strong>
            <span>{roleLabel}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
