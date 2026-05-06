"use client";

import AudioEngine from "./AudioEngine";
import { getPhonetic } from "../../data/phonetics";

export interface WordCardProps {
  /** The English word (e.g. "Apple") */
  word: string;
  /** Swahili translation (e.g. "Tofaa") */
  sw?: string;
  /** Emoji illustration */
  emoji?: string;
  /** Override phonetic — falls back to central phonetics map */
  phonetic?: string;
  /** Path to the pronunciation MP3 */
  audioUrl: string;
  /** Layout variant */
  variant?: "card" | "inline" | "row";
  /** Hide the Swahili translation (for challenge mode) */
  hideSwahili?: boolean;
}

/**
 * WordCard — The "Surgical Audio Component".
 *
 * Displays:
 *   [emoji]  Word         ← English word (always visible)
 *            (phonetic)   ← Swahili-readable pronunciation (always visible)
 *            🔊 button    ← Click to hear correct English pronunciation
 *            Swahili      ← Translation (hideable for challenge mode)
 */
export default function WordCard({
  word,
  sw,
  emoji,
  phonetic,
  audioUrl,
  variant = "card",
  hideSwahili = false,
}: WordCardProps) {
  const phonetics = phonetic ?? getPhonetic(word);

  if (variant === "inline") {
    return (
      <span className="wc-inline">
        {emoji && <span className="wc-inline-emoji" aria-hidden="true">{emoji}</span>}
        <strong className="wc-inline-word">{word}</strong>
        {phonetics && <span className="wc-inline-ph">({phonetics})</span>}
        <AudioEngine audioUrl={audioUrl} size="sm" />
        {sw && !hideSwahili && <span className="wc-inline-sw">— {sw}</span>}
        <style>{`
          .wc-inline {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            flex-wrap: wrap;
          }
          .wc-inline-emoji { font-size: 1em; }
          .wc-inline-word { color: #e2e8f0; font-size: 0.9rem; }
          .wc-inline-ph { color: #34d399; font-size: 0.8rem; font-family: var(--font-geist-mono, monospace); }
          .wc-inline-sw { color: #64748b; font-size: 0.78rem; font-style: italic; }
        `}</style>
      </span>
    );
  }

  if (variant === "row") {
    return (
      <div className="wc-row">
        {emoji && <span className="wc-row-emoji" aria-hidden="true">{emoji}</span>}
        <div className="wc-row-text">
          <span className="wc-row-word">{word}</span>
          {phonetics && <span className="wc-row-ph">({phonetics})</span>}
        </div>
        <AudioEngine audioUrl={audioUrl} size="sm" />
        {sw && !hideSwahili && <span className="wc-row-sw">{sw}</span>}
        <style>{`
          .wc-row {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 0.6rem;
            padding: 0.55rem 0.85rem;
          }
          .wc-row-emoji { font-size: 1.4rem; flex-shrink: 0; }
          .wc-row-text { display: flex; flex-direction: column; flex: 1; gap: 0.05rem; min-width: 0; }
          .wc-row-word { font-size: 0.9rem; font-weight: 700; color: #e2e8f0; }
          .wc-row-ph { font-size: 0.75rem; color: #34d399; font-family: var(--font-geist-mono, monospace); }
          .wc-row-sw { font-size: 0.78rem; color: #64748b; font-style: italic; flex-shrink: 0; }
        `}</style>
      </div>
    );
  }

  // Default: "card" variant
  return (
    <div className="wc-card">
      {/* Top — emoji */}
      {emoji && (
        <span className="wc-card-emoji" aria-hidden="true">{emoji}</span>
      )}

      {/* Middle — word + phonetic + audio */}
      <div className="wc-card-center">
        <span className="wc-card-word">{word}</span>
        {phonetics && (
          <span className="wc-card-ph" title="Phonetic pronunciation (Swahili-readable)">
            ({phonetics})
          </span>
        )}
        <AudioEngine audioUrl={audioUrl} size="sm" />
      </div>

      {/* Bottom — Swahili translation */}
      {sw && !hideSwahili && (
        <span className="wc-card-sw">{sw}</span>
      )}

      <style>{`
        .wc-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.9rem;
          padding: 0.9rem 0.75rem;
          min-width: 100px;
          transition: border-color 0.15s;
        }
        .wc-card:hover { border-color: rgba(52,211,153,0.2); }
        .wc-card-emoji { font-size: 1.8rem; line-height: 1; }
        .wc-card-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
        }
        .wc-card-word {
          font-size: 0.88rem;
          font-weight: 800;
          color: #e2e8f0;
          text-align: center;
        }
        .wc-card-ph {
          font-size: 0.75rem;
          color: #34d399;
          font-family: var(--font-geist-mono, monospace);
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        .wc-card-sw {
          font-size: 0.72rem;
          color: #64748b;
          font-style: italic;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
