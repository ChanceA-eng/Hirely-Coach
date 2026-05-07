"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { loadInterviewHistory } from "../../lib/interviewStorage";

export default function GuestInterviewProcessingPage() {
  const router = useRouter();
  const { userId, isSignedIn } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    // Verify user actually has interview results
    // (This guards against signup-first users being directed here by mistake)
    const interviewHistory = userId ? loadInterviewHistory(userId) : [];
    if (interviewHistory.length === 0) {
      // No interview data → user did signup-first, skip feedback
      fetch("/api/user/mode")
        .then((res) => res.json() as Promise<{ current_mode: "foundation" | "coach" | null }>)
        .then((data) => {
          const homeUrl = data.current_mode === "foundation" ? "/foundation/home" : "/growthhub";
          router.replace(homeUrl);
        })
        .catch(() => {
          router.replace("/growthhub");
        });
      return;
    }

    setChecked(true);
    const timer = window.setTimeout(() => {
      router.replace("/onboarding/track-select");
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [isSignedIn, userId, router]);

  return (
    <main className="gh-main lp-root lp-accelerator-theme" style={{ padding: "2rem 1rem" }}>
      <section className="glass-card" style={{ maxWidth: 760, margin: "0 auto", padding: "2rem" }}>
        <p className="gh-eyebrow">Finalizing</p>
        <h1 className="gh-h1" style={{ marginBottom: 8 }}>Saving your interview...</h1>
        <p className="lp-section-sub" style={{ marginBottom: 20 }}>
          Analyzing your results and preparing your personalized feedback.
        </p>
        <div style={{ height: 10, borderRadius: 999, background: "rgba(16,185,129,0.15)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: "55%",
              background: "linear-gradient(90deg,#10b981,#34d399)",
              animation: "gh-emerald-pulse 1.4s ease-in-out infinite alternate",
            }}
          />
        </div>
      </section>
    </main>
  );
}
