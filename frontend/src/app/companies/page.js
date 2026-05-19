"use client";

import { CompaniesScreen } from "@/features/contacts/components/contacts-screen/contacts-screen";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";

export default function CompaniesPage() {
  const state = useAuthenticatedUser();

  if (state.loading) {
    return null;
  }

  if (!state.user) {
    return null;
  }

  return <CompaniesScreen user={state.user} />;
}
