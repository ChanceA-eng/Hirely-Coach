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
  const headlineNotes = simpleLines.slice(0, 4);
  const detailNotes = simpleLines.slice(4);
  const score = latest.starrScore ?? 0;

  return (
    <main className="gh-main lp-root" style={{ padding: "2rem 1rem 3rem" }}>
      <section style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gap: 20 }}>
        <div className="glass-card" style={{ padding: "2rem 2.1rem", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ maxWidth: 760 }}>
              <p className="gh-eyebrow">Foundation Interview Feedback</p>
              <h1 className="gh-h1" style={{ marginBottom: 10 }}>Great work. Here is your full report.</h1>
              <p className="lp-section-sub" style={{ marginBottom: 0 }}>
                We organized this page so you can review your result, your coaching notes, and your next step without hunting through a narrow card.
              </p>
            </div>
            <div className="fb-score-block" style={{ minWidth: 120 }}>
              <div className="fb-score-num">{score}</div>
              <div className="fb-score-label">STARR Score / 100</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div className="glass-card" style={{ padding: "1rem 1.1rem" }}>
              <p className="gh-section-label">Interview Target</p>
              <p style={{ margin: "0.25rem 0 0", color: "#f8fafc", fontSize: "1rem", fontWeight: 700 }}>
                {latest.jobTitle || "Foundation Interview"}
              </p>
            </div>
            <div className="glass-card" style={{ padding: "1rem 1.1rem" }}>
              <p className="gh-section-label">Status</p>
              <p style={{ margin: "0.25rem 0 0", color: "#a7f3d0", fontSize: "1rem", fontWeight: 700 }}>
                Saved to your account
              </p>
            </div>
            <div className="glass-card" style={{ padding: "1rem 1.1rem" }}>
              <p className="gh-section-label">Next Step</p>
              <p style={{ margin: "0.25rem 0 0", color: "#e2e8f0", fontSize: "1rem", fontWeight: 700 }}>
                Review feedback, then keep learning in Foundation
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <section className="glass-card" style={{ padding: "1.8rem 2rem", display: "grid", gap: 18 }}>
            <div>
              <p className="gh-section-label">Top Coaching Notes</p>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {headlineNotes.map((line, index) => (
                  <div key={`${index}-${line.slice(0, 18)}`} style={{ borderRadius: 16, border: "1px solid rgba(16,185,129,0.18)", background: "rgba(15,23,42,0.42)", padding: "0.95rem 1rem" }}>
                    <p style={{ margin: 0, color: "#e2e8f0", lineHeight: 1.65 }}>{line}</p>
                  </div>
                ))}
              </div>
            </div>

            {detailNotes.length > 0 && (
              <div>
                <p className="gh-section-label">More Detail</p>
                <ul style={{ margin: "12px 0 0", paddingLeft: "1.15rem", color: "#cbd5e1", lineHeight: 1.8 }}>
                  {detailNotes.map((line, index) => (
                    <li key={`${index}-${line.slice(0, 18)}`}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <aside className="glass-card" style={{ padding: "1.8rem 1.6rem", display: "grid", gap: 16, alignContent: "start" }}>
            <div>
              <p className="gh-section-label">Next Move</p>
              <p style={{ margin: "0.5rem 0 0", color: "#94a3b8", lineHeight: 1.7 }}>
                Keep building your English confidence inside Foundation, then come back and practice another interview when you are ready.
              </p>
            </div>
            <Link href="/foundation/home" className="global-auth-btn global-auth-btn--strong" style={{ display: "inline-flex", justifyContent: "center" }}>
              Go to Foundation Home
            </Link>
            <Link href="/voice" className="global-auth-btn" style={{ display: "inline-flex", justifyContent: "center" }}>
              Practice Again
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
