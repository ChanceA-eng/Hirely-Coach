"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { loadInterviewHistory } from "../lib/interviewStorage";

type ModeResponse = {
  current_mode: "foundation" | "coach" | null;
  foundation_profile: { onboarding_complete: boolean; total_xp: number; language_pref: "en" | "sw" };
};

export default function OnboardingRootPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    // 1. MUST BE SIGNED IN
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    fetch("/api/user/mode")
      .then((response) => response.json() as Promise<ModeResponse>)
      .then((data) => {
        const userId = user?.id;
        const mode = data.current_mode;
        const onboardingComplete = data.foundation_profile?.onboarding_complete;

        // 2. IF ALREADY COMPLETED ONBOARDING, GO HOME
        if (onboardingComplete && mode) {
          const homeUrl = mode === "foundation" ? "/foundation/home" : "/growthhub";
          router.replace(homeUrl);
          return;
        }

        // 3. IF NO MODE SELECTED YET, GO TO TRACK SELECTION
        if (!mode) {
          router.replace("/onboarding/track-select");
          return;
        }

        // 4. MODE SELECTED BUT ONBOARDING NOT COMPLETE
        // Check if user has interview results
        const interviewHistory = userId ? loadInterviewHistory(userId) : [];
        const hasInterviewResults = interviewHistory.length > 0;

        // Interview-first users: have results, must process/show feedback
        if (hasInterviewResults) {
          router.replace("/onboarding/guest-processing");
          return;
        }

        // Signup-first users: no interview results, skip feedback entirely
        const homeUrl = mode === "foundation" ? "/foundation/home" : "/growthhub";
        router.replace(homeUrl);
      })
      .catch(() => {
        router.replace("/onboarding/track-select");
      });
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #0a0a0a 0%, #0f172a 50%, #0a0a0a 100%)",
      }}
    >
      <p
        style={{
          color: "#cbd5e1",
          fontSize: "0.95rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Loading your path...
      </p>
    </main>
  );
}
