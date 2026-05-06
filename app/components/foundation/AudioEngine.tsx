"use client";

import { useRef, useState } from "react";
import { createStrictSofiaUtterance, warmSofiaVoices } from "../../lib/sofiaVoice";
import { toAudioSrc } from "../../lib/audioPath";
import { audioMap } from "../../data/audioMap";

interface AudioButtonProps {
  /** Direct audio URL, e.g. "/audio/word_apple.mp3" (from lesson JSON). */
  audioUrl?: string;
  /**
   * audioMap key, e.g. "m1_word_apple". Takes priority over audioUrl.
   * Use this for any button not driven by lesson JSON data.
   */
  audioKey?: string;
  label?: string;
  spokenText?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * AudioEngine — a single "Click to Hear" button.
 * Accepts either an audioKey (looked up in the global audioMap) or a raw audioUrl.
 * Falls back to Sofia TTS, then shows "Audio unavailable" if both fail.
 */
export default function AudioEngine({ audioUrl, audioKey, label, spokenText, size = "md" }: AudioButtonProps) {
  // Resolve the URL: key-based lookup takes priority over raw URL
  const resolvedUrl = audioKey
    ? (audioMap[audioKey] ? `/audio/${audioMap[audioKey]}` : undefined)
    : audioUrl;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "error">("idle");

  function speakFallback() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setState("error");
      return;
    }

    const text = (spokenText ?? label ?? "").trim();
    if (!text) {
      setState("error");
      return;
    }

    try {
      warmSofiaVoices();
      window.speechSynthesis.cancel();
      const utterance = createStrictSofiaUtterance(text, { lang: "en-US", rate: 0.92 });
      if (!utterance) {
        setState("error");
        return;
      }
      utterance.onstart = () => setState("playing");
      utterance.onend = () => setState("idle");
      utterance.onerror = () => setState("error");
      window.speechSynthesis.speak(utterance);
    } catch {
      setState("error");
    }
  }

  function play() {
    if (state === "playing") return;
    if (!resolvedUrl) {
      speakFallback();
      return;
    }

    const resolvedAudioUrl = toAudioSrc(resolvedUrl);
    if (!resolvedAudioUrl) {
      setState("error");
      return;
    }

    // Lazy-create the audio element
    if (!audioRef.current) {
      audioRef.current = new Audio(resolvedAudioUrl);
      audioRef.current.onended = () => setState("idle");
      audioRef.current.onerror = () => {
        console.warn("Missing audio:", resolvedAudioUrl);
        setState("error");
      };
    } else {
      audioRef.current.src = resolvedAudioUrl;
    }

    audioRef.current
      .play()
      .then(() => setState("playing"))
      .catch(() => speakFallback());
  }

  const sizeClass = size === "sm" ? "ae-sm" : size === "lg" ? "ae-lg" : "ae-md";

  const Icon = state === "playing"
    ? (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="7" y="6" width="3.5" height="12" rx="1" />
        <rect x="13.5" y="6" width="3.5" height="12" rx="1" />
      </svg>
    )
    : (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10v4h4l5 4V6L7 10H3z" />
        {state === "error" ? <path d="M17 9l4 6" /> : <path d="M16 8c1.8 1.2 2.8 2.5 2.8 4s-1 2.8-2.8 4" />}
      </svg>
    );

  return (
    <button
      className={`ae-btn ${sizeClass} ${state === "error" ? "ae-error" : ""}`}
      onClick={play}
      aria-label={`Play pronunciation${label ? ` for ${label}` : ""}`}
      title={state === "error" ? "Audio not yet available" : "Click to hear pronunciation"}
    >
      <span className="ae-icon">{Icon}</span>
      {state === "error" ? (
        <span className="ae-label">Audio unavailable</span>
      ) : (
        label && <span className="ae-label">{label}</span>
      )}

      <style>{`
        .ae-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid rgba(52, 211, 153, 0.3);
          border-radius: 999px;
          color: #34d399;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.15s;
          line-height: 1;
        }
        .ae-btn:hover { background: rgba(52, 211, 153, 0.18); }
        .ae-btn.ae-error {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
          cursor: not-allowed;
        }
        .ae-sm { padding: 0.25rem 0.6rem; font-size: 0.75rem; }
        .ae-md { padding: 0.4rem 0.85rem; font-size: 0.85rem; }
        .ae-lg { padding: 0.6rem 1.2rem; font-size: 1rem; }
        .ae-icon {
          width: 14px;
          height: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .ae-icon svg {
          width: 14px;
          height: 14px;
          stroke: currentColor;
          fill: none;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .ae-label { white-space: nowrap; }
      `}</style>
    </button>
  );
}
