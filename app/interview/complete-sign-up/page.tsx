"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { hasPendingGuestSession } from "../../lib/interviewStorage";

export default function InterviewCompleteSignUpPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace("/onboarding");
      return;
    }
    setHasPending(hasPendingGuestSession());
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="gh-main lp-root lp-accelerator-theme" style={{ padding: "2rem 1rem" }}>
      <section className="glass-card" style={{ maxWidth: 860, margin: "0 auto", padding: "2rem" }}>
        <p className="gh-eyebrow">Result Locked</p>
        <h1 className="gh-h1" style={{ marginBottom: 10 }}>Interview Complete! Great job.</h1>
        <p className="lp-section-sub" style={{ marginBottom: 18 }}>
          We&apos;ve analyzed your answers. To see your score and get your personalized coaching feedback,
          please create your free account.
        </p>

        <div className="lp-steps" style={{ marginTop: 20, marginBottom: 22 }}>
          <div className="lp-step glass-card">
            <div className="lp-step-top"><span className="lp-step-badge">Your Progress</span></div>
            <h3 className="lp-step-title">Interview Finished</h3>
            <p className="lp-step-body">
              Your answers were captured successfully and are ready to be attached to your account.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/sign-up" className="global-auth-btn global-auth-btn--strong" style={{ display: "inline-flex" }}>
            Save my Progress & See Feedback
          </Link>
          <Link href="/sign-in" className="global-auth-btn" style={{ display: "inline-flex" }}>
            I already have an account
          </Link>
        </div>

        {!hasPending ? (
          <p style={{ marginTop: 14, color: "#94a3b8", fontSize: "0.9rem" }}>
            No pending interview session found. Start a new interview from the interview setup page.
          </p>
        ) : null}
      </section>
    </main>
  );
}
