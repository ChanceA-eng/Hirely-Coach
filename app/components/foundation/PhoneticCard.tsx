"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSofiaUtterance, warmSofiaVoices } from "../../lib/sofiaVoice";
import { toAudioSrc } from "../../lib/audioPath";
import { playAudioUrl } from "../../lib/playAudio";

export interface PhoneticSound {
  label: string;
  phonetic_sw: string;
  examples: Array<{ word: string; sw: string; emoji: string; phonetic_sw?: string; audio_url?: string }>;
  audio_url: string;
}

interface PhoneticCardProps {
  letter: string;
  sounds: PhoneticSound[];
  professionalAssociation?: string;
  professionalAssociationSw?: string;
  /** When false (Swahili-first ON), show Swahili as primary. When true, English only. */
  showSwahili?: boolean;
}

/**
 * PhoneticCard — renders a letter with one or two sound variants.
 * Swahili-First: phonetic bridge and Swahili translations are always visible.
 * If there are 2 sounds, renders a split card with side-by-side panels.
 */
export default function PhoneticCard({
  letter,
  sounds,
  professionalAssociation,
  professionalAssociationSw,
  showSwahili = true,
}: PhoneticCardProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const allAudio = useMemo(() => {
    const urls: string[] = [];
    for (const slot of sounds) {
      if (slot.audio_url) urls.push(slot.audio_url);
      for (const ex of slot.examples) {
        if (ex.audio_url) urls.push(ex.audio_url);
      }
    }
    return Array.from(new Set(urls));
  }, [sounds]);

  // Pre-load audio files at lesson start to remove click delay.
  useEffect(() => {
    const cache = audioCacheRef.current;
    for (const url of allAudio) {
      const resolvedUrl = toAudioSrc(url);
      if (!resolvedUrl || cache.has(resolvedUrl)) continue;
      const a = new Audio(resolvedUrl);
      a.preload = "auto";
      a.load();
      cache.set(resolvedUrl, a);
    }

    return () => {
      for (const audio of cache.values()) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [allAudio]);

  function stopAll() {
    for (const audio of audioCacheRef.current.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function speakFallback(text: string, id: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      setPlayingId(null);
      return;
    }
    warmSofiaVoices();
    const utterance = createSofiaUtterance(text, { lang: "en-US", rate: 0.92 });
    utterance.onstart = () => setPlayingId(id);
    utterance.onend = () => setPlayingId((prev) => (prev === id ? null : prev));
    utterance.onerror = () => setPlayingId((prev) => (prev === id ? null : prev));
    window.speechSynthesis.speak(utterance);
  }

  async function playAudio(id: string, url?: string, fallbackText?: string) {
    stopAll();
    const resolvedUrl = toAudioSrc(url);
    if (!resolvedUrl) {
      speakFallback(fallbackText ?? "", id);
      return;
    }

    const cached = audioCacheRef.current.get(resolvedUrl) ?? new Audio(resolvedUrl);
    audioCacheRef.current.set(resolvedUrl, cached);
    cached.onended = () => setPlayingId((prev) => (prev === id ? null : prev));
    cached.onerror = () => speakFallback(fallbackText ?? "", id);

    try {
      cached.currentTime = 0;
      setPlayingId(id);
      await cached.play();
    } catch {
      speakFallback(fallbackText ?? "", id);
    }
  }

  return (
    <div className="pc-wrap">
      {/* Letter hero */}
      <div className="pc-letter-hero">
        <button
          className={`pc-letter ${playingId?.startsWith(`${letter}_`) ? "pc-letter--glow" : ""}`}
          onClick={() => playAudio(`${letter}_letter`, sounds[0]?.audio_url, letter)}
          aria-label={`Play letter ${letter}`}
        >
          {letter}
        </button>
        <div className="pc-pro-tags">
          {professionalAssociationSw && (
            <span className="pc-pro-tag pc-pro-tag--sw">{professionalAssociationSw}</span>
          )}
          {professionalAssociation && (
            <span className="pc-pro-tag pc-pro-tag--en"
              style={{ opacity: showSwahili ? 1 : 0.5, fontSize: showSwahili ? undefined : "0.65rem" }}>
              {professionalAssociation}
            </span>
          )}
        </div>
      </div>

      {/* Slot sections — one by one like Audio Slot 1 / Audio Slot 2 */}
      <div className="pc-panel">
        {sounds.map((slot, slotIdx) => {
          const slotId = `${letter}_slot_${slotIdx + 1}`;
          const slotPlaying = playingId === slotId;
          return (
            <div key={slotId} className="pc-slot">
              <div className="pc-bridge-row">
                <span className="pc-bridge-label">Audio Slot {slotIdx + 1}:</span>
                <span className="pc-bridge-sw">{slot.phonetic_sw}</span>
                <span className="pc-bridge-en">({slot.label})</span>
                <button
                  className={`pc-audio-btn ${slotPlaying ? "pc-audio-btn--active" : ""}`}
                  onClick={() => playAudio(slotId, slot.audio_url, slot.examples.map((e) => e.word).join(" "))}
                >
                  {slotPlaying ? "⏸" : "🔊"}
                </button>
              </div>

              <div className="pc-examples">
                {slot.examples.map((ex, exIdx) => {
                  const exId = `${letter}_slot_${slotIdx + 1}_ex_${exIdx + 1}`;
                  const exPlaying = playingId === exId;
                  return (
                    <button
                      key={exId}
                      className={`pc-example-row ${exPlaying ? "pc-example-row--active" : ""}`}
                      onClick={() => playAudio(exId, ex.audio_url ?? slot.audio_url, ex.word)}
                    >
                      <span className="pc-example-emoji">{ex.emoji}</span>
                      <span className="pc-example-main">{ex.word}</span>
                      {ex.phonetic_sw && <span className="pc-example-ph">({ex.phonetic_sw})</span>}
                      <span className="pc-example-sw">{ex.sw}</span>
                      <span className="pc-example-audio">{exPlaying ? "⏸" : "🔊"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .pc-wrap {
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(52, 211, 153, 0.15);
          border-radius: 1.25rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .pc-letter-hero {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }
        .pc-letter {
          font-size: 4rem;
          font-weight: 900;
          color: #34d399;
          line-height: 1;
          letter-spacing: -0.03em;
          font-family: var(--font-geist-mono, monospace);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .pc-letter--glow {
          text-shadow: 0 0 14px rgba(52, 211, 153, 0.8);
          filter: brightness(1.2);
        }
        .pc-pro-tags {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .pc-pro-tag {
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.4rem;
          padding: 0.2rem 0.6rem;
          font-style: italic;
          width: fit-content;
        }
        .pc-pro-tag--sw { color: #34d399; }
        .pc-pro-tag--en { color: #64748b; }
        .pc-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .pc-slot {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 0.75rem;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .pc-bridge-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .pc-bridge-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #475569;
        }
        .pc-bridge-sw {
          font-size: 0.92rem;
          color: #34d399;
          font-family: var(--font-geist-mono, monospace);
          font-weight: 700;
        }
        .pc-bridge-en {
          font-size: 0.78rem;
          color: #64748b;
          font-style: italic;
        }
        .pc-audio-btn {
          width: 1.8rem;
          height: 1.8rem;
          border-radius: 999px;
          border: 1px solid rgba(52, 211, 153, 0.35);
          background: rgba(52, 211, 153, 0.08);
          color: #34d399;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pc-audio-btn--active {
          box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.3), 0 0 12px rgba(52, 211, 153, 0.35);
        }
        .pc-examples {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .pc-example-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          text-align: left;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.55rem;
          padding: 0.45rem 0.65rem;
          color: #e2e8f0;
          cursor: pointer;
        }
        .pc-example-row--active {
          border-color: rgba(52, 211, 153, 0.35);
          box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.18), 0 0 10px rgba(52, 211, 153, 0.22);
        }
        .pc-example-emoji { font-size: 1rem; }
        .pc-example-main { font-size: 0.86rem; font-weight: 700; }
        .pc-example-ph { font-size: 0.76rem; color: #34d399; font-family: var(--font-geist-mono, monospace); }
        .pc-example-sw { margin-left: auto; font-size: 0.76rem; color: #64748b; font-style: italic; }
        .pc-example-audio { font-size: 0.75rem; color: #34d399; }
        @media (max-width: 640px) {
          .pc-example-row { flex-wrap: wrap; }
          .pc-example-sw { margin-left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
