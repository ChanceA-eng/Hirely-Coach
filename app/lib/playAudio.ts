"use client";

/**
 * playAudio — universal audio player for the Hirely Foundation platform.
 *
 * Usage (key-based, preferred):
 *   import { playAudio } from "@/lib/playAudio";
 *   <button onClick={() => playAudio("m10_name")}>▶</button>
 *
 * Usage (URL-based, for dynamic data from lesson JSON):
 *   import { playAudioUrl } from "@/lib/playAudio";
 *   playAudioUrl("/audio/word_apple.mp3");
 *
 * Rules:
 *  - All audio files live in /public/audio/
 *  - File naming: lowercase, underscores, .mp3, module prefix (m{N}_{stem})
 *  - No other audio logic should exist in the codebase
 *  - If a file is missing, "Audio unavailable" is shown; no error is thrown
 */

import { audioMap } from "@/app/data/audioMap";

// ── State callback registry ────────────────────────────────────────────────
// Components can subscribe to know when audio starts/ends/fails.
type AudioState = "playing" | "idle" | "unavailable";
type StateListener = (state: AudioState) => void;
const listeners = new Set<StateListener>();

export function onAudioState(fn: StateListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(state: AudioState) {
  listeners.forEach((fn) => fn(state));
}

// ── Shared audio instance (one at a time) ─────────────────────────────────
let current: HTMLAudioElement | null = null;

function stopCurrent() {
  if (current) {
    current.pause();
    current.src = "";
    current = null;
  }
}

function createAndPlay(src: string): void {
  stopCurrent();

  const audio = new Audio(src);
  current = audio;

  audio.addEventListener("play", () => emit("playing"), { once: true });
  audio.addEventListener("ended", () => { current = null; emit("idle"); }, { once: true });
  audio.addEventListener(
    "error",
    () => {
      console.warn("[playAudio] File not found or failed to load:", src);
      current = null;
      emit("unavailable");
      showAudioUnavailableUI();
    },
    { once: true }
  );

  audio.play().catch(() => {
    current = null;
    emit("unavailable");
    showAudioUnavailableUI();
  });
}

// ── UI feedback for missing audio ─────────────────────────────────────────
function showAudioUnavailableUI() {
  if (typeof document === "undefined") return;
  const id = "hf-audio-unavailable-toast";
  if (document.getElementById(id)) return; // already shown

  const el = document.createElement("div");
  el.id = id;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.style.cssText = [
    "position:fixed",
    "bottom:1.5rem",
    "right:1.5rem",
    "background:#1f2937",
    "color:#f87171",
    "border:1px solid rgba(248,113,113,0.3)",
    "border-radius:0.5rem",
    "padding:0.5rem 1rem",
    "font-size:0.85rem",
    "font-weight:600",
    "z-index:9999",
    "pointer-events:none",
    "transition:opacity 0.3s",
  ].join(";");
  el.textContent = "Audio unavailable";
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Play audio by audioMap key (e.g. "m1_word_apple", "m10_name").
 * This is the preferred API — every audio button should use this.
 */
export function playAudio(key: string): void {
  if (typeof window === "undefined") return;

  const file = audioMap[key];
  if (!file) {
    console.warn("[playAudio] No mapping found for key:", key);
    showAudioUnavailableUI();
    return;
  }

  createAndPlay(`/audio/${file}`);
}

/**
 * Play audio by direct URL path (e.g. "/audio/word_apple.mp3").
 * Used by LessonRenderer and other components that read URLs from lesson JSON.
 * Normalises the path through the same pipeline as playAudio().
 */
export function playAudioUrl(url: string): void {
  if (typeof window === "undefined" || !url) return;

  // Normalise: strip leading /audio/ and .mp3, then rebuild
  const stem = url
    .replace(/^\/audio\//, "")
    .replace(/\.mp3$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!stem) {
    showAudioUnavailableUI();
    return;
  }

  createAndPlay(`/audio/${stem}.mp3`);
}

/**
 * Stop any currently playing audio.
 */
export function stopAudio(): void {
  stopCurrent();
  emit("idle");
}
