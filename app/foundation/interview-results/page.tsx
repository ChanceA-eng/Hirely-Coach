"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { loadInterviewHistory, type InterviewSession } from "../../lib/interviewStorage";

type ModePayload = {
  current_mode: "foundation" | "coach" | null;
};

function toSimpleFeedback(feedback: string): string[] {
  if (!feedback) return ["Your interview was saved successfully."];
  const lines = feedback
    .split(/\r?\n/)
    .map((line) => line.replace(/[#*`>-]/g, "").trim())
    .filter((line) => line.length > 0);
  return lines.slice(0, 8);
}

export default function FoundationInterviewResultsPage() {
  const router = useRouter();
  const { userId, isSignedIn } = useAuth();
  const [latest, setLatest] = useState<InterviewSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const history = loadInterviewHistory(userId);
    if (history[0]) {
      setLatest(history[0]);
      setChecking(false);
      return;
    }

    fetch("/api/user/mode")
      .then((response) => response.json() as Promise<ModePayload>)
      .then((payload) => {
        router.replace(payload.current_mode === "coach" ? "/growthhub" : "/foundation/home");
      })
      .catch(() => {
        router.replace("/foundation/home");
      });
  }, [isSignedIn, router, userId]);

  if (checking || !latest) {
    return (
      <main className="gh-main lp-root" style={{ padding: "2rem 1rem" }}>
        <section className="glass-card" style={{ maxWidth: 820, margin: "0 auto", padding: "2rem" }}>
          <p className="gh-eyebrow">Foundation Results</p>
          <h1 className="gh-h1">Loading your results...</h1>
        </section>
      </main>
    );
  }

  const simpleLines = toSimpleFeedback(latest.feedback || "");

  return (
    <main className="gh-main lp-root" style={{ padding: "2rem 1rem" }}>
      <section className="glass-card" style={{ maxWidth: 860, margin: "0 auto", padding: "2rem" }}>
        <p className="gh-eyebrow">Interview Complete</p>
        <h1 className="gh-h1" style={{ marginBottom: 10 }}>Great work. Here is your feedback.</h1>
        <p className="lp-section-sub" style={{ marginBottom: 16 }}>
          We kept this in simple English so you can learn faster.
        </p>
        <div className="lp-steps" style={{ marginBottom: 18 }}>
          <div className="lp-step glass-card">
            <div className="lp-step-top"><span className="lp-step-badge">Your Coaching Notes</span></div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#cbd5e1", lineHeight: 1.7 }}>
              {simpleLines.map((line, index) => (
                <li key={`${index}-${line.slice(0, 16)}`}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/foundation/home" className="global-auth-btn global-auth-btn--strong" style={{ display: "inline-flex" }}>
            Go to Foundation Home
          </Link>
          <Link href="/voice" className="global-auth-btn" style={{ display: "inline-flex" }}>
            Practice Again
          </Link>
        </div>
      </section>
    </main>
  );
}
