"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  ActivityIcon,
  AnalyticsIcon,
  DealsIcon,
  InboxIcon,
  OfficeIcon,
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
      { id: "pipeline", label: "Pipeline", icon: <PipelineIcon />, href: "/pipeline", match: ["/pipeline"] },
      { id: "contacts", label: "Contacts", icon: <PeopleIcon />, href: "/contacts", match: ["/contacts"] },
      { id: "companies", label: "Companies", icon: <OfficeIcon />, href: "/companies", match: ["/companies"] },
      { id: "deals", label: "Deals", icon: <DealsIcon />, href: "/deals", match: ["/deals"] },
      { id: "activity", label: "Activity", icon: <ActivityIcon />, href: "/activity", match: ["/activity"] },
    ],
  },
  {
    title: "Tools",
    items: [
      { id: "inbox", label: "Inbox", icon: <InboxIcon />, href: "/inbox", match: ["/inbox"] },
      { id: "reports", label: "Reports", icon: <AnalyticsIcon />, href: "/reports", match: ["/reports"] },
      { id: "settings", label: "Settings", icon: <SettingsIcon />, href: "/settings", match: ["/settings"], requiresSettingsAccess: true },
    ],
  },
];

export function Sidebar({ user, onNavigate }) {
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
    onNavigate?.();
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
    onNavigate?.();
    router.push("/profile");
  }

  function handleRouteChange(href) {
    if (href === pathname) {
      onNavigate?.();
      return;
    }
    onNavigate?.();
    router.push(href);
  }

  function isItemActive(item) {
    if (item.match?.length) {
      return item.match.some((value) => pathname === value || pathname.startsWith(`${value}/`));
    }
    return false;
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={user?.company?.logo_url || user?.companies?.[0]?.logo_url ? styles.brandLogo : styles.brandMark}>
          {user?.company?.logo_url || user?.companies?.[0]?.logo_url ? (
            <Image
              className={styles.brandLogoImage}
              src={user?.company?.logo_url || user?.companies?.[0]?.logo_url}
              alt={`${companyName} logo`}
              width={160}
              height={72}
              style={{ width: "auto", height: "auto" }}
              unoptimized
            />
          ) : (
            "CRM"
          )}
        </div>
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
                item.requiresSettingsAccess && !user?.can_access_settings ? null : (
                <button
                  key={item.id}
                  className={`${styles.navItem} ${isItemActive(item) ? styles.navItemActive : ""}`}
                  type="button"
                  onClick={() => handleRouteChange(item.href)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
                )
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
