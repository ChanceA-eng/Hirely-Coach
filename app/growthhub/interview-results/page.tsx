"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { loadInterviewHistory, type InterviewSession } from "../../lib/interviewStorage";

type ModePayload = {
  current_mode: "foundation" | "coach" | null;
};

function formatFeedbackHtml(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const formatted = escaped
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^\-\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return `<p>${formatted}</p>`;
}

export default function GrowthHubInterviewResultsPage() {
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
        router.replace(payload.current_mode === "foundation" ? "/foundation/home" : "/growthhub");
      })
      .catch(() => {
        router.replace("/growthhub");
      });
  }, [isSignedIn, router, userId]);

  if (checking || !latest) {
    return (
      <main className="gh-main lp-root" style={{ padding: "2rem 1rem" }}>
        <section className="glass-card" style={{ maxWidth: 860, margin: "0 auto", padding: "2rem" }}>
          <p className="gh-eyebrow">Interview Results</p>
          <h1 className="gh-h1">Loading your results...</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="gh-main lp-root" style={{ padding: "2rem 1rem" }}>
      <section className="iv-feedback glass-card" style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="iv-feedback-header">
          <span className="lp-eyebrow">Interview Complete</span>
          <h1 className="lp-h2" style={{ marginBottom: 0 }}>Your Professional Feedback</h1>
        </div>
        <div
          className="iv-feedback-body md-body"
          dangerouslySetInnerHTML={{ __html: formatFeedbackHtml(latest.feedback || "No feedback available.") }}
        />
        <div className="iv-feedback-actions">
          <Link href="/growthhub" className="lp-btn-primary">Go to GrowthHub</Link>
          <Link href="/voice" className="lp-btn-ghost">Run Another Interview</Link>
        </div>
      </section>
    </main>
  );
}
