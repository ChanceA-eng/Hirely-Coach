"use client";

import { useState } from "react";

interface SofiaGuideProps {
  message: string;
  messageSw?: string;
  variant?: "hint" | "intro" | "celebrate";
  showTranslate?: boolean;
}

export default function SofiaGuide({
  message,
  messageSw,
  variant = "hint",
  showTranslate = true,
}: SofiaGuideProps) {
  // Swahili-first: default to showing Swahili if available
  const [showSw, setShowSw] = useState<boolean>(!!messageSw);

  const avatarBg =
    variant === "celebrate"
      ? "radial-gradient(circle, #fbbf24, #f59e0b)"
      : variant === "intro"
      ? "radial-gradient(circle, #818cf8, #6366f1)"
      : "radial-gradient(circle, #34d399, #059669)";

  const borderColor =
    variant === "celebrate" ? "#fbbf24" : variant === "intro" ? "#818cf8" : "#34d399";

  const displayText = showSw && messageSw ? messageSw : message;

  return (
    <div className="sofia-wrap">
      {/* Avatar */}
      <div className="sofia-avatar" style={{ background: avatarBg }} aria-hidden="true">
        <span className="sofia-face">
          {variant === "celebrate" ? "🎉" : variant === "intro" ? "👩‍🏫" : "💡"}
        </span>
      </div>

      {/* Bubble */}
      <div className="sofia-bubble" style={{ borderColor }}>
        <div className="sofia-name">
          Sofia{variant === "intro" && " — Your Guide"}
          {variant === "celebrate" && " — Congratulations!"}
        </div>
        <p className="sofia-text">{displayText}</p>
        {showTranslate && messageSw && (
          <button
            className="sofia-translate-btn"
            onClick={() => setShowSw((v) => !v)}
            aria-pressed={showSw}
          >
            {showSw ? "🇬🇧 Soma kwa Kiingereza" : "🇹🇿 Rudi Kiswahili"}
          </button>
        )}
      </div>

      <style>{`
        .sofia-wrap {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 1rem;
          background: rgba(255,255,255,0.02);
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .sofia-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1.3rem;
        }
        .sofia-face { line-height: 1; }
        .sofia-bubble {
          flex: 1;
          border-left: 3px solid;
          padding-left: 0.85rem;
        }
        .sofia-name {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 0.25rem;
        }
        .sofia-text {
          font-size: 0.92rem;
          color: #cbd5e1;
          line-height: 1.6;
          margin: 0 0 0.5rem;
        }
        .sofia-translate-btn {
          font-size: 0.72rem;
          font-weight: 600;
          color: #64748b;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 0.18rem 0.6rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sofia-translate-btn:hover {
          color: #94a3b8;
          border-color: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}
