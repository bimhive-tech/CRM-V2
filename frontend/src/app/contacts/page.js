"use client";

import { ContactsScreen } from "@/features/contacts/components/contacts-screen/contacts-screen";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";

export default function ContactsPage() {
  const state = useAuthenticatedUser();

  if (state.loading) {
    return null;
  }

  if (!state.user) {
    return null;
  }

  return <ContactsScreen user={state.user} />;
}
