"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type ModeResponse = {
  current_mode: "foundation" | "coach" | null;
  foundation_profile: { onboarding_complete: boolean; total_xp: number; language_pref: "en" | "sw" };
};

export default function OnboardingRootPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    fetch("/api/user/mode")
      .then((response) => response.json() as Promise<ModeResponse>)
      .then((data) => {
        if (data.foundation_profile?.onboarding_complete) {
          router.replace(data.current_mode === "foundation" ? "/foundation/home" : "/growthhub");
          return;
        }
        router.replace("/onboarding/track-select");
      })
      .catch(() => {
        router.replace("/onboarding/track-select");
      });
  }, [isLoaded, isSignedIn, router]);

  return null;
}
