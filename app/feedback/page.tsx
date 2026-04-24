"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  saveGrowthHubSnapshot,
  saveInterviewSession,
  savePendingGuestSession,
} from "../lib/interviewStorage";

type Payload = {
  resume: string;
  jobTitle?: string;
  job: string;
  questions: string[];
  answers: string[];
  level?: string;
};

function extractSection(feedback: string, header: string): string {
  const start = feedback.indexOf(header);
  if (start < 0) return "";
  const rest = feedback.slice(start + header.length);
  const nextHeader = rest.search(/\n###\s+/);
  return (nextHeader >= 0 ? rest.slice(0, nextHeader) : rest).trim();
}

function clipSentence(text: string): string {
  const first = text.split(/(?<=[.!?])\s+/)[0] ?? "";
  return first.trim().slice(0, 180);
}

function extractWeakPoints(feedback: string): string[] {
  const improvement = extractSection(feedback, "### Areas for Improvement");
  return Array.from(improvement.matchAll(/\*\*([^*]+)\*\*/g))
    .map((m) => m[1].trim())
    .filter(Boolean)
    .slice(0, 3);
}

function extractStarrHighlights(feedback: string) {
  const components = ["Situation", "Task", "Action", "Result", "Reflection"] as const;
  const out: Partial<Record<(typeof components)[number], string>> = {};

  for (const component of components) {
    const re = new RegExp(`\\*\\*${component}\\*\\*\\s*—\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*|\\n###|$)`);
    const m = feedback.match(re);
    if (m?.[1]) {
      out[component] = clipSentence(m[1]);
    }
  }
  return out;
}

function extractStrongPoints(feedback: string, starrHighlights: Partial<Record<"Situation" | "Task" | "Action" | "Result" | "Reflection", string>>): string[] {
  const strongSignals = /strong|clear|well|effective|compelling|confident|specific|good|excellent|solid/i;
  const points: string[] = [];

  for (const [component, text] of Object.entries(starrHighlights)) {
    if (!text) continue;
    if (strongSignals.test(text)) {
      points.push(`${component}: ${text}`);
    }
  }

  if (points.length === 0) {
    const overall = extractSection(feedback, "### Overall Performance");
    if (overall) {
      points.push(clipSentence(overall));
    }
  }

  return points.slice(0, 3);
}

function formatFeedbackHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");
}

function scoreColor(score: number) {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#3b82f6";
  return "#f59e0b";
}

export default function FeedbackPage() {
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  const payload = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("hirelyCoachFeedbackPayload");
      if (!raw) return null;
      return JSON.parse(raw) as Payload;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!payload?.resume || !payload?.job || !payload?.questions?.length) {
        router.push("/voice");
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 45000);

      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            resume: payload.resume,
            job: payload.job,
            questions: payload.questions,
            answers: payload.answers,
            level: payload.level,
          }),
        });

        const data = await res.json();
        const generatedFeedback = data.feedback || "Feedback unavailable.";

        if (!res.ok) {
          setError(data.error || "Unable to generate feedback.");
          setLoading(false);
          return;
        }

        const sessionId = crypto.randomUUID();
        const createdAt = Date.now();
        const scoreMatch = generatedFeedback.match(/STARR Score:\s*(\d+)\/100/);
        const starrScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
        const improvIdx = generatedFeedback.indexOf("### Areas for Improvement");
        const improvText = improvIdx >= 0 ? generatedFeedback.slice(improvIdx) : "";
        const weakMatch = improvText.match(/\*\*([^*]+)\*\*/);
        const topWeakness = weakMatch ? weakMatch[1] : "";
        const jobTitle =
          payload.jobTitle?.trim() ||
          payload.job.trim().split("\n")[0]?.trim().slice(0, 80) ||
          "Interview Session";
        const starrHighlights = extractStarrHighlights(generatedFeedback);

        const session = {
          id: sessionId,
          createdAt,
          resume: payload.resume,
          jobTitle,
          job: payload.job,
          questions: payload.questions,
          answers: payload.answers,
          feedback: generatedFeedback,
          level: payload.level,
          starrScore,
          transcript: payload.questions.map((question, index) => ({
            question,
            answer: payload.answers[index] || "(no response)",
          })),
          analysis: {
            starrHighlights,
            weakPoints: extractWeakPoints(generatedFeedback),
            strongPoints: extractStrongPoints(generatedFeedback, starrHighlights),
          },
        };

        const snapshot = {
          sessionId,
          createdAt,
          starrScore,
          topWeakness,
          jobTitle,
        };

        saveInterviewSession(session, userId);
        saveGrowthHubSnapshot(snapshot, userId);

        if (!isSignedIn) {
          savePendingGuestSession(session, snapshot);
        }

        window.sessionStorage.removeItem("hirelyCoachFeedbackPayload");

        setSavedSessionId(sessionId);
        setFeedback(generatedFeedback);
        setScore(starrScore);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError("Feedback took too long. Please try again.");
        } else {
          setError("Unable to generate feedback. Please try again.");
        }
      } finally {
        window.clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    run();
  }, [isSignedIn, payload, router, userId]);

  return (
    <div className="lp-root">
      <main className="page-shell-gh">

        {/* ── Page header ── */}
        <div className="anim-fade-up" style={{ marginBottom: 36 }}>
          <p className="gh-page-eyebrow">Interview Feedback</p>
          <div className="fb-header-row">
            <div>
              <h1 className="gh-page-h1">Your Performance Report</h1>
              <p className="gh-page-sub">
                AI-generated STARR framework analysis of your mock interview answers.
              </p>
            </div>
            {score !== null && (
              <div className="fb-score-block">
                <div className="fb-score-num" style={{ color: scoreColor(score) }}>
                  {score}
                </div>
                <div className="fb-score-label">STARR Score&nbsp;/ 100</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Feedback card ── */}
        <div
          className="glass-card anim-fade-up anim-fade-up--d1"
          style={{ padding: "32px 36px", borderRadius: 24 }}
        >
          {loading && (
            <div className="fb-loading">
              <div className="fb-spinner" />
              <span>Generating your feedback — this takes up to 30 s…</span>
            </div>
          )}

          {!loading && error && (
            <div className="error-banner" style={{ marginBottom: 24 }}>
              {error}
            </div>
          )}

          {!loading && !error && (
            <div
              className="md-body"
              dangerouslySetInnerHTML={{
                __html: `<p>${formatFeedbackHtml(feedback)}</p>`,
              }}
            />
          )}

          {!loading && (
            <div className="page-card-actions">
              <button
                className="lp-btn-ghost"
                type="button"
                onClick={() =>
                  savedSessionId
                    ? router.push(`/voice?mode=retry&sessionId=${savedSessionId}`)
                    : router.push("/voice")
                }
              >
                Retry Interview
              </button>
              <button
                className="lp-btn-primary"
                type="button"
                onClick={() => router.push("/growthhub")}
              >
                GrowthHub →
              </button>
              <button
                className="lp-btn-ghost"
                type="button"
                onClick={() => router.push("/training")}
                style={{ marginLeft: "auto" }}
              >
                Go to Accelerator
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
