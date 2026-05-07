"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { setFoundationOnboardingComplete, setMode } from "../../lib/foundationProgress";
import { loadInterviewHistory, migrateGuestDataToUser } from "../../lib/interviewStorage";
import { syncInterviewProgress } from "../../lib/interviewProgress";

type ModePayload = {
  current_mode: "foundation" | "coach" | null;
  foundation_profile?: { onboarding_complete?: boolean };
};

export default function TrackSelectPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { isLoaded, isSignedIn } = useUser();
  const [selecting, setSelecting] = useState<"foundation" | "coach" | null>(null);
  const { signOut } = useClerk();
  const [checkingGate, setCheckingGate] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    fetch("/api/user/mode")
      .then((res) => res.json() as Promise<ModePayload>)
      .then((payload) => {
        if (payload.foundation_profile?.onboarding_complete && payload.current_mode) {
          router.replace(payload.current_mode === "foundation" ? "/foundation/home" : "/growthhub");
          return;
        }
        setCheckingGate(false);
      })
      .catch(() => {
        setCheckingGate(false);
      });
  }, [isLoaded, isSignedIn, router]);

  async function handleLogout() {
    if (selecting) return;
    await signOut({ redirectUrl: "/" });
  }

  async function choose(track: "foundation" | "coach") {
    setSelecting(track);
    try {
      // Check if user has actual interview results (interview-first user)
      const interviewHistory = userId ? loadInterviewHistory(userId) : [];
      const hasInterviewResults = interviewHistory.length > 0;

      // If interview-first: migrate guest data to user account
      if (userId && hasInterviewResults) {
        const migration = migrateGuestDataToUser(userId);
        if (migration.latestSnapshot) {
          await syncInterviewProgress(migration.latestSnapshot).catch(() => {
            // Non-blocking: local migration already completed.
          });
        }
      }

      // Persist to Clerk metadata
      await fetch("/api/user/mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_mode: track,
          foundation_profile: { onboarding_complete: true },
        }),
      });
      // Mirror to localStorage for instant reads
      setMode(track);
      setFoundationOnboardingComplete(true);

      // Interview-first users: go to feedback page
      if (hasInterviewResults) {
        if (track === "foundation") {
          router.push("/foundation/interview-results");
        } else {
          router.push("/growthhub/interview-results");
        }
        return;
      }

      // Signup-first users: skip feedback, go straight home
      if (track === "foundation") {
        router.push("/foundation/home");
      } else {
        router.push("/growthhub");
      }
    } catch {
      setSelecting(null);
    }
  }

  if (!isLoaded || checkingGate) {
    return (
      <div className="ts-root">
        <div className="ts-loading" aria-live="polite">Loading your path...</div>
        <style>{`
          .ts-root {
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0a0a 0%, #0f172a 50%, #0a0a0a 100%);
            display: grid;
            place-items: center;
          }
          .ts-loading {
            color: #cbd5e1;
            font-size: 0.95rem;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="ts-root">
      <div className="ts-container">
        {/* Header */}
        <div className="ts-header">
          <div className="ts-logo">
            <span className="ts-logo-h">H</span>
            <span className="ts-logo-text">irely</span>
          </div>
          <p className="ts-eyebrow">Your Journey Starts Here</p>
          <h1 className="ts-headline">Choose Your Path</h1>
          <p className="ts-sub">
            Two doors. One goal: better career outcomes. Which stage are you in right now?
          </p>
        </div>

        {/* Two-Door Cards */}
        <div className="ts-doors">

          {/* Path A — Foundation */}
          <button
            className={`ts-door ts-door--foundation ${selecting === "foundation" ? "ts-door--loading" : ""}`}
            onClick={() => choose("foundation")}
            disabled={selecting !== null}
            aria-label="Choose Foundation path"
          >
            <div className="ts-door-badge">Path A</div>
            <div className="ts-door-icon">🌱</div>
            <h2 className="ts-door-title">
              Hirely Foundation
            </h2>
            <p className="ts-door-subtitle">
              Msingi wa Lugha ya Kiingereza
            </p>
            <p className="ts-door-desc">
              &ldquo;Nataka kujifunza Kiingereza kutoka msingi.&rdquo;
            </p>
            <ul className="ts-door-list">
              <li>📖 Masomo ya sauti na alfabeti</li>
              <li>🔊 Bonyeza kusikia matamshi sahihi</li>
              <li>🇹🇿 Daraja la Kiswahili kila wakati</li>
              <li>🎓 Hitimu na ufungue Hirely Coach</li>
            </ul>
            <div className="ts-door-cta">
              {selecting === "foundation" ? "Inaanza…" : "Anza Foundation →"}
            </div>
          </button>

          {/* Divider */}
          <div className="ts-divider">
            <span>or</span>
          </div>

          {/* Path B — Coach */}
          <button
            className={`ts-door ts-door--coach ${selecting === "coach" ? "ts-door--loading" : ""}`}
            onClick={() => choose("coach")}
            disabled={selecting !== null}
            aria-label="Choose Coach path"
          >
            <div className="ts-door-badge">Path B</div>
            <div className="ts-door-icon">🚀</div>
            <h2 className="ts-door-title">
              Hirely Coach
            </h2>
            <p className="ts-door-subtitle">
              The Career Operating System
            </p>
            <p className="ts-door-desc">
              &ldquo;My English is ready. I want to grow my career.&rdquo;
            </p>
            <ul className="ts-door-list">
              <li>📄 AI Resume Optimizer</li>
              <li>🎤 Mock Interview Simulator</li>
              <li>📊 Impact Ledger &amp; IP Ranking</li>
              <li>🏆 GrowthHub &amp; Career Targeting</li>
            </ul>
            <div className="ts-door-cta">
              {selecting === "coach" ? "Entering…" : "Enter Coach Mode →"}
            </div>
          </button>
        </div>

        {/* Reassurance note */}
        <p className="ts-note">
          Foundation graduates enter Hirely Coach at <strong>Level 1</strong> with a
          <strong> Foundation Graduate badge</strong> and <strong>+150 bonus Impact Points</strong>.
          Earn your place with confidence.
        </p>

        <button type="button" className="ts-logout" onClick={() => void handleLogout()}>
          Log Out
        </button>
      </div>

      <style>{`
        .ts-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #0f172a 50%, #0a0a0a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }
        .ts-container {
          max-width: 860px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2.5rem;
        }
        .ts-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .ts-logo {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }
        .ts-logo-h {
          color: #818cf8;
        }
        .ts-logo-text {
          color: #fff;
        }
        .ts-eyebrow {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #818cf8;
          margin: 0;
        }
        .ts-headline {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: #fff;
          margin: 0;
          letter-spacing: -0.03em;
        }
        .ts-sub {
          font-size: 1.05rem;
          color: #94a3b8;
          max-width: 480px;
          line-height: 1.6;
          margin: 0;
        }
        .ts-doors {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 0;
          width: 100%;
          align-items: stretch;
        }
        @media (max-width: 640px) {
          .ts-doors {
            grid-template-columns: 1fr;
          }
          .ts-divider {
            flex-direction: row;
          }
        }
        .ts-door {
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 1.25rem;
          padding: 2rem 1.75rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: left;
          position: relative;
          overflow: hidden;
        }
        .ts-door:hover:not(:disabled) {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.2);
        }
        .ts-door--foundation:hover:not(:disabled) {
          border-color: #34d399;
          box-shadow: 0 0 40px rgba(52, 211, 153, 0.12);
          background: rgba(52, 211, 153, 0.04);
        }
        .ts-door--coach:hover:not(:disabled) {
          border-color: #818cf8;
          box-shadow: 0 0 40px rgba(129, 140, 248, 0.12);
          background: rgba(129, 140, 248, 0.04);
        }
        .ts-door--loading {
          opacity: 0.7;
          cursor: wait;
        }
        .ts-door-badge {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          color: #94a3b8;
        }
        .ts-door--foundation .ts-door-badge { background: rgba(52,211,153,0.15); color: #34d399; }
        .ts-door--coach    .ts-door-badge { background: rgba(129,140,248,0.15); color: #818cf8; }
        .ts-door-icon {
          font-size: 2.5rem;
          line-height: 1;
        }
        .ts-door-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .ts-door-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
          font-style: italic;
        }
        .ts-door-desc {
          font-size: 0.95rem;
          color: #94a3b8;
          margin: 0.25rem 0;
          line-height: 1.5;
          font-style: italic;
        }
        .ts-door-list {
          list-style: none;
          padding: 0;
          margin: 0.25rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .ts-door-list li {
          font-size: 0.85rem;
          color: #cbd5e1;
        }
        .ts-door-cta {
          margin-top: 0.75rem;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .ts-door--foundation .ts-door-cta { color: #34d399; }
        .ts-door--coach    .ts-door-cta { color: #818cf8; }
        .ts-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 1.25rem;
          color: #334155;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          gap: 0.5rem;
        }
        .ts-divider::before,
        .ts-divider::after {
          content: "";
          flex: 1;
          width: 1px;
          background: rgba(255,255,255,0.06);
        }
        @media (max-width: 640px) {
          .ts-divider { flex-direction: row; padding: 1rem 0; }
          .ts-divider::before, .ts-divider::after { height: 1px; width: auto; }
        }
        .ts-note {
          font-size: 0.82rem;
          color: #475569;
          text-align: center;
          max-width: 500px;
          line-height: 1.7;
          margin: 0;
        }
        .ts-note strong {
          color: #818cf8;
        }
        .ts-logout {
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 0.92rem;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
          padding: 0;
          opacity: 0.9;
          transition: color 0.2s ease, opacity 0.2s ease;
        }
        .ts-logout:hover {
          color: #cbd5e1;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
