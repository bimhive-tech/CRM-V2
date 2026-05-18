"use client";

import { PipelineScreen } from "@/features/pipeline/components/pipeline-screen/pipeline-screen";
import { useAuthenticatedUser } from "@/lib/hooks/use-authenticated-user";

export default function PipelinePage() {
  const state = useAuthenticatedUser();

  if (state.loading) {
    return null;
  }

  if (!state.user) {
    return null;
  }

  return <PipelineScreen user={state.user} />;
}
