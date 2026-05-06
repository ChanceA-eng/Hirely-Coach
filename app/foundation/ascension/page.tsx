"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FOUNDATION_IP_BONUS, getMode } from "../../lib/foundationProgress";

export default function AscensionPage() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mode = getMode();
  const coachEntryHref = mode === "coach" ? "/growthhub" : "/foundation/home";

  useEffect(() => {
    // Auto-redirect to allowed destination after 7 seconds
    timerRef.current = setTimeout(() => {
      router.push(coachEntryHref);
    }, 7000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [coachEntryHref, router]);

  return (
    <div className="asc-root">
      {/* Stars background */}
      <div className="asc-stars" aria-hidden="true">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="asc-star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
              width: `${Math.random() > 0.8 ? 4 : 2}px`,
              height: `${Math.random() > 0.8 ? 4 : 2}px`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="asc-content">
        <div className="asc-badge-ring">
          <span className="asc-badge-icon">🎓</span>
        </div>

        <p className="asc-eyebrow">Foundation Complete</p>
        <h1 className="asc-headline">
          You Are No Longer a Student.
          <br />
          <span className="asc-headline-accent">You Are a Candidate.</span>
        </h1>

        <p className="asc-sub">
          Your Foundation is built. Your language is ready. Now the real work begins.
        </p>

        {/* Rewards */}
        <div className="asc-rewards">
          <div className="asc-reward">
            <span className="asc-reward-icon">🏅</span>
            <span>Foundation Graduate Badge — Unlocked</span>
          </div>
          <div className="asc-reward">
            <span className="asc-reward-icon">⚡</span>
            <span>+{FOUNDATION_IP_BONUS} Impact Points — Awarded</span>
          </div>
          <div className="asc-reward">
            <span className="asc-reward-icon">🚀</span>
            <span>Hirely Coach — Unlocked at Level 1</span>
          </div>
        </div>

        <p className="asc-redirect">
          {mode === "coach" ? "Entering Hirely Coach in a moment…" : "Returning to Foundation Home in a moment…"}
        </p>

        <button
          className="asc-btn"
          onClick={() => router.push(coachEntryHref)}
        >
          {mode === "coach" ? "Enter Hirely Coach Now →" : "Return to Foundation Home →"}
        </button>
      </div>

      <style>{`
        @keyframes asc-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes asc-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes asc-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.4), 0 0 60px rgba(52,211,153,0.1); }
          50% { box-shadow: 0 0 0 20px rgba(52,211,153,0), 0 0 80px rgba(52,211,153,0.2); }
        }
        @keyframes asc-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .asc-root {
          min-height: 100vh;
          background: #050a10;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 2rem;
        }
        .asc-stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .asc-star {
          position: absolute;
          background: #fff;
          border-radius: 50%;
          animation: asc-twinkle linear infinite;
        }
        .asc-content {
          position: relative;
          z-index: 1;
          max-width: 560px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          text-align: center;
          animation: asc-fade-up 0.8s ease both;
        }
        .asc-badge-ring {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(52,211,153,0.15), transparent);
          border: 2px solid rgba(52,211,153,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          animation: asc-float 3s ease-in-out infinite, asc-ring-pulse 2s ease-in-out infinite;
        }
        .asc-eyebrow {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #34d399;
          margin: 0;
        }
        .asc-headline {
          font-size: clamp(1.6rem, 5vw, 2.6rem);
          font-weight: 900;
          color: #f1f5f9;
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }
        .asc-headline-accent {
          color: #34d399;
        }
        .asc-sub {
          font-size: 0.95rem;
          color: #64748b;
          line-height: 1.7;
          margin: 0;
          max-width: 380px;
        }
        .asc-rewards {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          width: 100%;
          max-width: 360px;
        }
        .asc-reward {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(52,211,153,0.05);
          border: 1px solid rgba(52,211,153,0.15);
          border-radius: 0.65rem;
          padding: 0.65rem 1rem;
          font-size: 0.85rem;
          color: #94a3b8;
          text-align: left;
        }
        .asc-reward-icon { font-size: 1.2rem; flex-shrink: 0; }
        .asc-redirect {
          font-size: 0.78rem;
          color: #334155;
          margin: 0;
        }
        .asc-btn {
          padding: 0.8rem 2rem;
          background: linear-gradient(135deg, #34d399, #059669);
          border: none;
          border-radius: 0.7rem;
          color: #0a0a0a;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: -0.01em;
        }
        .asc-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(52,211,153,0.35);
        }
      `}</style>
    </div>
  );
}
