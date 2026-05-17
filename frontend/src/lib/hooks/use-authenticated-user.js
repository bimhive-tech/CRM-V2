"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/lib/api/auth";
import { clearSession, getAccessToken } from "@/lib/session";

export function useAuthenticatedUser() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    let active = true;

    getCurrentUser(token)
      .then((user) => {
        if (!active) return;
        setState({ loading: false, user });
      })
      .catch(() => {
        clearSession();
        if (!active) return;
        setState({ loading: false, user: null });
        router.replace("/");
      });

    return () => {
      active = false;
    };
  }, [router]);

  return state;
}
