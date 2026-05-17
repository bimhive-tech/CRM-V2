"use client";

import { ProfileScreen } from "@/features/profile/components/profile-screen/profile-screen";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";

export default function ProfilePage() {
  const state = useAuthenticatedUser();

  if (state.loading) {
    return null;
  }

  if (!state.user) {
    return null;
  }

  return <ProfileScreen user={state.user} />;
}
