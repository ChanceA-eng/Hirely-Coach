"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { setFoundationOnboardingComplete, setMode } from "../../lib/foundationProgress";
import { clearClaimedGuestInterview, getClaimedGuestInterview } from "../../lib/interviewStorage";

export default function ChoosePathPage() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const [selecting, setSelecting] = useState<"foundation" | "coach" | null>(null);

  async function choose(track: "foundation" | "coach") {
    setSelecting(track);
    try {
      await fetch("/api/user/mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_mode: track,
          foundation_profile: { onboarding_complete: true },
        }),
      });

      setMode(track);
      setFoundationOnboardingComplete(true);
      clearClaimedGuestInterview();

      if (track === "foundation") {
        router.push("/foundation/interview-results");
      } else {
        router.push("/growthhub/interview-results");
      }
    } catch {
      setSelecting(null);
    }
  }

  if (!isLoaded) return null;

  const pending = getClaimedGuestInterview();

  return (
    <div className="ts-root">
      <div className="ts-container">
        <div className="ts-header">
          <p className="ts-eyebrow">We have your results ready!</p>
          <h1 className="ts-headline">To give you the most helpful feedback, tell us your goal:</h1>
          {pending ? (
            <p className="ts-sub">Interview captured at {new Date(pending.createdAt).toLocaleString()}.</p>
          ) : (
            <p className="ts-sub">Choose your path and we will open your feedback instantly.</p>
          )}
        </div>

        <div className="ts-doors">
          <button
            className={`ts-door ts-door--coach ${selecting === "coach" ? "ts-door--loading" : ""}`}
            onClick={() => choose("coach")}
            disabled={selecting !== null}
            aria-label="Choose professional coaching path"
          >
            <div className="ts-door-badge">Professional</div>
            <div className="ts-door-icon">🚀</div>
            <h2 className="ts-door-title">I want high-level career coaching and SEO tools.</h2>
            <p className="ts-door-desc">Technical feedback, deeper breakdowns, and full GrowthHub workflows.</p>
            <div className="ts-door-cta">{selecting === "coach" ? "Opening..." : "Open Professional Feedback →"}</div>
          </button>

          <div className="ts-divider"><span>or</span></div>

          <button
            className={`ts-door ts-door--foundation ${selecting === "foundation" ? "ts-door--loading" : ""}`}
            onClick={() => choose("foundation")}
            disabled={selecting !== null}
            aria-label="Choose foundation learning path"
          >
            <div className="ts-door-badge">Foundation</div>
            <div className="ts-door-icon">🌱</div>
            <h2 className="ts-door-title">I want to learn English and basic job skills in a simple way.</h2>
            <p className="ts-door-desc">Simple language, encouraging insights, and a Foundation-first experience.</p>
            <div className="ts-door-cta">{selecting === "foundation" ? "Opening..." : "Open Foundation Feedback →"}</div>
          </button>
        </div>
      </div>
    </div>
  );
}
