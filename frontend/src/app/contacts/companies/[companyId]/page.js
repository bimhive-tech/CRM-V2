"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell/dashboard-shell";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Topbar } from "@/components/dashboard/topbar/topbar";
import { getCrmCompany } from "@/lib/api/admin";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";

import styles from "@/features/contacts/components/contacts-screen/contacts-screen.module.css";

export default function CompanyDetailPage() {
  const params = useParams();
  const authState = useAuthenticatedUser();
  const [state, setState] = useState({ loading: true, company: null, error: "" });

  useEffect(() => {
    if (authState.loading || !authState.user || !params?.companyId) {
      return;
    }

    const token = getAccessToken();
    let active = true;

    getCrmCompany(token, params.companyId)
      .then((company) => {
        if (!active) {
          return;
        }
        setState({ loading: false, company, error: "" });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setState({ loading: false, company: null, error: error.message || "Unable to load company." });
      });

    return () => {
      active = false;
    };
  }, [authState.loading, authState.user, params]);

  if (authState.loading || state.loading) {
    return null;
  }

  if (!authState.user) {
    return null;
  }

  return (
    <DashboardShell sidebar={<Sidebar user={authState.user} />} topbar={<Topbar user={authState.user} title={state.company?.name || "Company"} />}>
      <div className={styles.stack}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Companies</p>
            <h1>{state.company?.name || "Company details"}</h1>
            <p className={styles.copy}>
              {state.error
                ? state.error
                : "The company detail page is ready. Next, we can shape the sections and workflows you want inside it."}
            </p>
          </div>
        </section>

        {state.company ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Overview</p>
                <h2>Company snapshot</h2>
              </div>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.copy}><strong>Name:</strong> {state.company.name}</p>
              <p className={styles.copy}><strong>Owner:</strong> {state.company.owner_name || "No owner listed"}</p>
              <p className={styles.copy}><strong>Email:</strong> {state.company.email || "No email"}</p>
              <p className={styles.copy}><strong>Website:</strong> {state.company.website || "No website"}</p>
              <p className={styles.copy}><strong>Phone numbers:</strong> {(state.company.phone_numbers || []).join(" · ") || "No numbers"}</p>
              <p className={styles.copy}><strong>Address:</strong> {state.company.address || "No address"}</p>
            </div>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
