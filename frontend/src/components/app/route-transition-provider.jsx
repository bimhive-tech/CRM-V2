"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const MIN_VISIBLE_MS = 260;
const EXIT_DURATION_MS = 220;

const RouteTransitionContext = createContext({
  startTransition: () => {},
});

export function RouteTransitionProvider({ children }) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const transitionStartedAtRef = useRef(0);
  const pendingRef = useRef(false);
  const exitTimerRef = useRef(null);
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pendingRef.current || pathname === previousPathnameRef.current) {
      previousPathnameRef.current = pathname;
      return;
    }

    previousPathnameRef.current = pathname;
    const elapsed = Date.now() - transitionStartedAtRef.current;
    const waitTime = Math.max(0, MIN_VISIBLE_MS - elapsed);

    const timeoutId = window.setTimeout(() => {
      setPhase("exiting");
      exitTimerRef.current = window.setTimeout(() => {
        pendingRef.current = false;
        setPhase("idle");
      }, EXIT_DURATION_MS);
    }, waitTime);

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  const value = useMemo(
    () => ({
      startTransition() {
        if (exitTimerRef.current) {
          clearTimeout(exitTimerRef.current);
          exitTimerRef.current = null;
        }
        transitionStartedAtRef.current = Date.now();
        pendingRef.current = true;
        setPhase("visible");
      },
    }),
    [],
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
      {phase !== "idle" ? (
        <div className={`routeLoader ${phase === "exiting" ? "routeLoaderExiting" : ""}`} aria-hidden="true">
          <div className="routeLoaderSpinner" />
        </div>
      ) : null}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  return useContext(RouteTransitionContext);
}
