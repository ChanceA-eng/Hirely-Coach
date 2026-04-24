"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  clearInterviewHistory,
  loadInterviewHistory,
  type InterviewSession,
} from "../lib/interviewStorage";

// ─── Markdown renderer ────────────────────────────────────────────────────────
function formatFeedbackHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");
}

// ─── Level helpers ────────────────────────────────────────────────────────────
function sessionLevel(session: InterviewSession): string {
  if (session.level) return session.level;
  const n = session.questions.length;
  if (n <= 3) return "Quick";
  if (n <= 6) return "Medium";
  return "Intensive";
}

function levelClass(level: string) {
  const l = level.toLowerCase();
  if (l === "quick") return "level-badge--quick";
  if (l === "medium") return "level-badge--medium";
  return "level-badge--intensive";
}

function sessionJobTitle(session: InterviewSession): string {
  return (
    session.jobTitle?.trim() ||
    session.job.trim().split("\n")[0]?.trim().slice(0, 60) ||
    "Interview Session"
  );
}

function scoreColor(score: number) {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#3b82f6";
  return "#f59e0b";
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({
  session,
  delay,
}: {
  session: InterviewSession;
  delay: number;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const title = sessionJobTitle(session);
  const level = sessionLevel(session);
  const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const score = session.starrScore ?? null;

  return (
    <div
      className="hist-card glass-card anim-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="hist-card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="hist-card-title">{title}</p>
          <div className="hist-card-meta">
            <span className={`level-badge ${levelClass(level)}`}>{level}</span>
            <span>{session.questions.length}Q</span>
            <span>·</span>
            <span>{session.answers.filter(Boolean).length} answers</span>
            <span>·</span>
            <span>{dateStr}</span>
          </div>
        </div>
        {score !== null && (
          <div className="hist-card-score" style={{ color: scoreColor(score) }}>
            {score}<span> /100</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="hist-feedback-toggle"
          onClick={() => setShowFeedback((v) => !v)}
        >
          {showFeedback ? "Hide feedback ↑" : "View feedback ↓"}
        </button>
        <button
          className="hist-feedback-toggle"
          onClick={() => setShowTranscript((v) => !v)}
        >
          {showTranscript ? "Hide transcript ↑" : "View transcript ↓"}
        </button>
        <Link
          href={`/voice?mode=retry&sessionId=${session.id}`}
          className="hist-retry-btn"
        >
          Retry →
        </Link>
      </div>

      {session.analysis && (
        <div className="hist-highlights">
          {session.analysis.strongPoints.length > 0 && (
            <div>
              <p className="hist-highlight-label hist-highlight-label--strong">Strong points</p>
              <div className="hist-highlight-list">
                {session.analysis.strongPoints.map((point, idx) => (
                  <span key={`${point}-${idx}`} className="hist-highlight-pill hist-highlight-pill--strong">{point}</span>
                ))}
              </div>
            </div>
          )}
          {session.analysis.weakPoints.length > 0 && (
            <div>
              <p className="hist-highlight-label hist-highlight-label--weak">Weak points</p>
              <div className="hist-highlight-list">
                {session.analysis.weakPoints.map((point, idx) => (
                  <span key={`${point}-${idx}`} className="hist-highlight-pill hist-highlight-pill--weak">{point}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showFeedback && (
        <div className="hist-feedback-body">
          <div
            className="md-body"
            dangerouslySetInnerHTML={{
              __html: `<p>${formatFeedbackHtml(
                session.feedback || "No feedback recorded."
              )}</p>`,
            }}
          />
        </div>
      )}

      {showTranscript && (
        <div className="hist-feedback-body">
          {session.analysis?.starrHighlights && (
            <div className="hist-starr-summary">
              {Object.entries(session.analysis.starrHighlights).map(([component, summary]) => (
                <div key={component} className="hist-starr-item">
                  <span className="hist-starr-key">{component}</span>
                  <span className="hist-starr-value">{summary}</span>
                </div>
              ))}
            </div>
          )}
          <div className="hist-transcript-list">
            {(session.transcript ?? session.questions.map((question, i) => ({ question, answer: session.answers[i] || "(no response)" }))).map((entry, idx) => (
              <div key={`${session.id}-${idx}`} className="hist-transcript-item">
                <p className="hist-transcript-q">Q{idx + 1}. {entry.question}</p>
                <p className="hist-transcript-a">A. {entry.answer || "(no response)"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHistory(loadInterviewHistory(userId));
    setHydrated(true);
  }, [userId]);

  const handleClear = () => {
    if (!window.confirm("Delete all interview history from this browser?")) return;
    clearInterviewHistory(userId);
    setHistory([]);
  };

  return (
    <div className="lp-root">
      <main className="page-shell-gh">
        {userId && (
          <Link href="/growthhub" className="gh-back-link" style={{ marginBottom: 16 }}>
            ← GrowthHub
          </Link>
        )}

        {/* ── Page header ── */}
        <div className="anim-fade-up" style={{ marginBottom: 40 }}>
          <p className="gh-page-eyebrow">Session archive</p>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <h1 className="gh-page-h1" style={{ marginBottom: 0 }}>Interview History</h1>
            {history.length > 0 && (
              <span className="stat-pill stat-pill--green">{history.length} session{history.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          <p className="gh-page-sub" style={{ marginTop: 10 }}>
            Your past mock interviews are stored locally in this browser.
            Revisit answers, AI feedback, and STARR scores at any time.
          </p>
        </div>

        {/* ── Action bar ── */}
        <div
          className="glass-card anim-fade-up anim-fade-up--d1"
          style={{ padding: "16px 24px", display: "flex", gap: 12, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}
        >
          <button
            className="lp-btn-primary"
            type="button"
            onClick={() => router.push("/voice?mode=new")}
          >
            New Interview
          </button>
          <button
            className="lp-btn-ghost"
            type="button"
            onClick={() => router.push("/growthhub")}
          >
            GrowthHub
          </button>
          <button
            className="lp-btn-ghost"
            type="button"
            onClick={handleClear}
            disabled={!history.length}
            style={{ marginLeft: "auto", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}
          >
            Clear history
          </button>
        </div>

        {/* ── Session list ── */}
        {!hydrated ? null : history.length === 0 ? (
          <div className="empty-state anim-fade-up anim-fade-up--d2">
            No interviews yet. Run your first mock interview to start tracking progress.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {history.map((session, i) => (
              <SessionCard
                key={session.id}
                session={session}
                delay={0.08 + i * 0.06}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
