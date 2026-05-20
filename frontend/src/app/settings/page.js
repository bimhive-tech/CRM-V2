"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { listCompanies, listPermissionCatalog, listRoles, listUsers } from "@/lib/api/admin";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";
import { SettingsScreen } from "@/features/settings/components/settings-screen/settings-screen";

function hasPermission(user, permissionCode) {
  return Boolean(user?.is_platform_admin || user?.permissions?.includes(permissionCode));
}

export default function SettingsPage() {
  const router = useRouter();
  const authState = useAuthenticatedUser();
  const [state, setState] = useState({ loading: true, companies: [], users: [], roles: [], permissionGroups: [] });

  useEffect(() => {
    if (authState.loading || !authState.user) {
      return;
    }

    if (!authState.user.can_access_settings) {
      router.replace("/dashboard");
      return;
    }

    const token = getAccessToken();
    const canViewUsers = hasPermission(authState.user, "users.view");
    const canViewRoles = hasPermission(authState.user, "roles.view");
    let active = true;

    Promise.all([
      listCompanies(token),
      canViewUsers ? listUsers(token) : Promise.resolve([]),
      canViewRoles ? listRoles(token) : Promise.resolve([]),
      listPermissionCatalog(token),
    ])
      .then(([companies, users, roles, permissionCatalog]) => {
        if (!active) return;
        setState({ loading: false, companies, users, roles, permissionGroups: permissionCatalog.groups || [] });
      })
      .catch(() => {
        if (!active) return;
        setState({ loading: false, companies: [], users: [], roles: [], permissionGroups: [] });
      });

    return () => {
      active = false;
    };
  }, [authState.loading, authState.user, router]);

  if (authState.loading || state.loading) {
    return null;
  }

  if (!authState.user || !authState.user.can_access_settings) {
    return null;
  }

  return (
    <SettingsScreen
      user={authState.user}
      companies={state.companies}
      users={state.users}
      roles={state.roles}
      permissionGroups={state.permissionGroups}
    />
  );
}
