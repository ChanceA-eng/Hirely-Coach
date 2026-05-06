"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Header from "./Header";
import { getMode, hydrateFoundationState } from "../lib/foundationProgress";

// Coach-only routes that Foundation users cannot access
const COACH_ONLY_PREFIXES = [
  "/growthhub",
  "/upload",
  "/voice",
  "/training",
  "/courses",
  "/canvas",
  "/history",
  "/starr-lab",
  "/hirely",
];

type ModePayload = {
  current_mode: "foundation" | "coach" | null;
  foundation_progress: {
    completedLessons: string[];
    completedModules: number[];
    assessmentScores: Record<string, number>;
    graduatedAt?: string;
  };
  foundation_profile: {
    onboarding_complete: boolean;
    total_xp: number;
    language_pref: "en" | "sw";
  };
  foundation_override?: {
    unlocked_modules?: number[];
  };
};

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  const hideHeader =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/onboarding/track-select");

  // Guard: redirect Foundation-mode users away from Coach routes
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !pathname) return;
    let cancelled = false;

    const enforce = async () => {
      try {
        const payload = await fetch("/api/user/mode").then((res) => res.json() as Promise<ModePayload>);
        if (cancelled) return;
        hydrateFoundationState({
          mode: payload.current_mode,
          progress: payload.foundation_progress,
          profile: payload.foundation_profile,
          override: payload.foundation_override,
        });
      } catch {
        // Fall back to local mode if cloud read fails
      }

      const mode = getMode();
      if (mode !== "foundation") return;

      const isCoachRoute = COACH_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
      if (isCoachRoute) {
        router.replace("/foundation/home");
      }
    };

    void enforce();

    return () => {
      cancelled = true;
    };
  }, [pathname, isLoaded, isSignedIn, router]);

  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  );
}