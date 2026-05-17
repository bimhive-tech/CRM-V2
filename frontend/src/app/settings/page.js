"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { listCompanies, listRoles, listUsers } from "@/lib/api/admin";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";
import { SettingsScreen } from "@/features/settings/components/settings-screen/settings-screen";

export default function SettingsPage() {
  const router = useRouter();
  const authState = useAuthenticatedUser();
  const [state, setState] = useState({ loading: true, companies: [], users: [], roles: [] });

  useEffect(() => {
    if (authState.loading || !authState.user) {
      return;
    }

    if (!authState.user.is_platform_admin) {
      router.replace("/dashboard");
      return;
    }

    const token = getAccessToken();
    let active = true;

    Promise.all([listCompanies(token), listUsers(token), listRoles(token)])
      .then(([companies, users, roles]) => {
        if (!active) return;
        setState({ loading: false, companies, users, roles });
      })
      .catch(() => {
        if (!active) return;
        setState({ loading: false, companies: [], users: [], roles: [] });
      });

    return () => {
      active = false;
    };
  }, [authState.loading, authState.user, router]);

  if (authState.loading || state.loading) {
    return null;
  }

  if (!authState.user || !authState.user.is_platform_admin) {
    return null;
  }

  return <SettingsScreen user={authState.user} companies={state.companies} users={state.users} roles={state.roles} />;
}
