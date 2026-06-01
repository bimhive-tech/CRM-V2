"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ProfileScreen } from "@/features/profile/components/profile-screen/profile-screen";
import { getUser } from "@/lib/api/admin";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";
import { getAccessToken } from "@/lib/session";

export function ProfilePageClient() {
  const state = useAuthenticatedUser();
  const searchParams = useSearchParams();
  const token = getAccessToken();
  const [remoteProfileUser, setRemoteProfileUser] = useState(null);
  const selectedUserId = searchParams.get("userId");

  useEffect(() => {
    if (!state.user) {
      return;
    }

    if (!selectedUserId || String(selectedUserId) === String(state.user.id)) {
      return;
    }

    let active = true;
    getUser(token, selectedUserId)
      .then((user) => {
        if (!active) {
          return;
        }
        setRemoteProfileUser(user);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setRemoteProfileUser(null);
      });

    return () => {
      active = false;
    };
  }, [selectedUserId, state.user, token]);

  if (state.loading) {
    return null;
  }

  if (!state.user) {
    return null;
  }

  const profileUser =
    selectedUserId && String(selectedUserId) !== String(state.user.id) ? remoteProfileUser || state.user : state.user;

  return <ProfileScreen currentUser={state.user} profileUser={profileUser} />;
}
