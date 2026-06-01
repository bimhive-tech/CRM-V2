import { Suspense } from "react";

import { ProfilePageClient } from "./profile-page-client";

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageClient />
    </Suspense>
  );
}
