"use client";

import { useMemo, useState } from "react";

type SentimentEmoji = "happy" | "neutral" | "sad";
type Category = "layout_issue" | "translation_error" | "pronunciation_help" | "idea";

function detectDeviceType(): string {
  const ua = navigator.userAgent;

  const samsung = ua.match(/SM-[A-Z0-9]+/i);
  if (samsung?.[0]) return `Samsung ${samsung[0].toUpperCase()}`;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android Device";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  return "Unknown Device";
}

function sentimentToScore(emoji: SentimentEmoji): number {
  if (emoji === "happy") return 5;
  if (emoji === "neutral") return 3;
  return 1;
}

const CATEGORY_LABELS: Record<Category, string> = {
  layout_issue: "Layout Issue",
  translation_error: "Translation Error",
  pronunciation_help: "Pronunciation Help",
  idea: "Idea",
};

export default function FeedbackPulseWidget() {
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<SentimentEmoji>("neutral");
  const [category, setCategory] = useState<Category>("idea");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const disabled = useMemo(() => saving || comment.trim().length < 3, [saving, comment]);

  async function submitQuickRate() {
    if (disabled) return;
    setSaving(true);
    setMessage("");

    try {
      const body = {
        kind: "pulse",
        sentiment_score: sentimentToScore(sentiment),
        emoji: sentiment,
        category,
        user_comment: comment.trim(),
        url: window.location.href,
        user_agent: navigator.userAgent,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        device_type: detectDeviceType(),
      };

      const response = await fetch("/api/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      setComment("");
      setSentiment("neutral");
      setCategory("idea");
      setMessage("Thanks. Your feedback is now in User Voice.");
      window.setTimeout(() => setOpen(false), 900);
    } catch {
      setMessage("Could not submit feedback. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open feedback quick rate"
        className="pulse-fab"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
          <path
            d="M4 5.5a3.5 3.5 0 0 1 3.5-3.5h9A3.5 3.5 0 0 1 20 5.5v7A3.5 3.5 0 0 1 16.5 16H10l-4.5 4v-4A3.5 3.5 0 0 1 4 12.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="pulse-card" role="dialog" aria-modal="true" aria-label="Quick Rate">
          <div className="pulse-head">
            <p className="pulse-title">Quick Rate</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close feedback card">×</button>
          </div>

          <div className="pulse-row">
            <span>How do you feel?</span>
            <div className="pulse-emoji-row">
              {([
                ["happy", "🙂"],
                ["neutral", "😐"],
                ["sad", "🙁"],
              ] as [SentimentEmoji, string][]).map(([value, icon]) => (
                <button
                  key={value}
                  type="button"
                  className={`pulse-emoji ${sentiment === value ? "on" : ""}`}
                  onClick={() => setSentiment(value)}
                  aria-label={value}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <label className="pulse-label" htmlFor="pulse-category">Category</label>
          <select
            id="pulse-category"
            className="pulse-input"
            value={category}
            onChange={(event) => setCategory(event.target.value as Category)}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label className="pulse-label" htmlFor="pulse-comment">Tell us what is on your mind</label>
          <textarea
            id="pulse-comment"
            className="pulse-input pulse-textarea"
            placeholder="Tell us what’s on your mind..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />

          <button type="button" className="pulse-submit" disabled={disabled} onClick={() => void submitQuickRate()}>
            {saving ? "Saving..." : "Send feedback"}
          </button>
          {message && <p className="pulse-message">{message}</p>}
        </div>
      )}

      <style jsx>{`
        .pulse-fab {
          position: fixed;
          right: 1rem;
          bottom: 1.2rem;
          width: 3rem;
          height: 3rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(15, 23, 42, 0.22);
          color: #e2e8f0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
          box-shadow: 0 12px 30px rgba(2, 6, 23, 0.35);
          z-index: 95;
          cursor: pointer;
        }
        .pulse-card {
          position: fixed;
          right: 1rem;
          bottom: 4.8rem;
          width: min(90vw, 21rem);
          border-radius: 1rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(2, 6, 23, 0.92);
          box-shadow: 0 28px 60px rgba(2, 6, 23, 0.5);
          padding: 0.85rem;
          z-index: 95;
          display: grid;
          gap: 0.65rem;
        }
        .pulse-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pulse-head button {
          border: 0;
          background: transparent;
          color: #cbd5e1;
          cursor: pointer;
          font-size: 1.1rem;
        }
        .pulse-title {
          margin: 0;
          font-size: 0.9rem;
          color: #f8fafc;
          font-weight: 700;
        }
        .pulse-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #cbd5e1;
          font-size: 0.78rem;
        }
        .pulse-emoji-row {
          display: inline-flex;
          gap: 0.35rem;
        }
        .pulse-emoji {
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.8);
          color: #e2e8f0;
          border-radius: 999px;
          width: 2rem;
          height: 2rem;
          cursor: pointer;
        }
        .pulse-emoji.on {
          border-color: rgba(16, 185, 129, 0.65);
          box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.45);
        }
        .pulse-label {
          color: #cbd5e1;
          font-size: 0.72rem;
          margin-bottom: -0.2rem;
          font-weight: 600;
        }
        .pulse-input {
          width: 100%;
          border-radius: 0.65rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.85);
          color: #e2e8f0;
          padding: 0.55rem 0.65rem;
          font-size: 0.8rem;
        }
        .pulse-textarea {
          min-height: 5rem;
          resize: vertical;
        }
        .pulse-submit {
          border-radius: 0.65rem;
          border: 1px solid rgba(16, 185, 129, 0.55);
          background: rgba(16, 185, 129, 0.18);
          color: #d1fae5;
          padding: 0.55rem 0.7rem;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }
        .pulse-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pulse-message {
          margin: 0;
          color: #a7f3d0;
          font-size: 0.74rem;
        }
        @media (max-width: 640px) {
          .pulse-fab {
            right: 0.75rem;
            bottom: 0.9rem;
          }
          .pulse-card {
            right: 0.75rem;
            bottom: 4.5rem;
          }
        }
      `}</style>
    </>
  );
}
