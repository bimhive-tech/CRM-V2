"use client";

import { DealsScreen } from "@/features/deals/components/deals-screen/deals-screen";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";

export default function DealsPage() {
  const state = useAuthenticatedUser();

  if (state.loading) {
    return null;
  }

  if (!state.user) {
    return null;
  }

  return <DealsScreen user={state.user} />;
}
