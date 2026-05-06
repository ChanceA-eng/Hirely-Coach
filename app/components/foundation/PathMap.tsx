"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FoundationCommandCenter from "./FoundationCommandCenter";
import {
  FOUNDATION_PROGRESS_EVENT,
  getFoundationProgress,
  getModuleScore,
  isModuleComplete,
  isModuleUnlocked,
  TOTAL_MODULES,
  type FoundationProgress,
} from "../../lib/foundationProgress";

const MODULES = [
  {
    num: 1,
    title: "The Sounds of Success",
    title_sw: "Sauti za Mafanikio",
    icon: "🔤",
    color: "#34d399",
    firstLesson: "1-1",
    totalLessons: 26,
    description: "Phonics, the alphabet, and pronunciation",
  },
  {
    num: 2,
    title: "Numbers and Colors",
    title_sw: "Namba na Rangi",
    icon: "🔢",
    color: "#818cf8",
    firstLesson: "2-1",
    totalLessons: 2,
    description: "Count confidently and describe colors with visual examples",
  },
  {
    num: 3,
    title: "Sound Mastery Lab",
    title_sw: "Maabara ya Umilisi wa Sauti",
    icon: "🗣",
    color: "#f59e0b",
    firstLesson: "3-1",
    totalLessons: 4,
    description: "Short and long vowels, digraphs, blends, and pronunciation tools",
  },
  {
    num: 4,
    title: "Pronouns and Verbs",
    title_sw: "Viwakilishi na Vitenzi",
    icon: "🧠",
    color: "#f97316",
    firstLesson: "4-1",
    totalLessons: 10,
    description: "Build sentence fluency with pronouns, verbs, and guided dialogues",
  },
  {
    num: 5,
    title: "Chakula na Ununuzi",
    title_sw: "Food and Shopping",
    icon: "🛒",
    color: "#ec4899",
    firstLesson: "5-1",
    totalLessons: 4,
    description: "Food, shopping vocabulary, and real-world scenarios",
  },
  {
    num: 6,
    title: "The Professional Vocabulary",
    title_sw: "Msamiati wa Kitaaluma",
    icon: "💼",
    color: "#f59e0b",
    firstLesson: "6-1",
    totalLessons: 6,
    description: "Office language, power verbs, and work communication",
  },
  {
    num: 7,
    title: "Conversation Confidence",
    title_sw: "Ujasiri wa Mazungumzo",
    icon: "🎤",
    color: "#f472b6",
    firstLesson: "7-1",
    totalLessons: 6,
    description: "Dialogues, listening, speaking practice, and module completion",
  },
  {
    num: 8,
    title: "Hali ya Hewa na Hisia",
    title_sw: "Weather and Feelings",
    icon: "🌤️",
    color: "#06b6d4",
    firstLesson: "8-1",
    totalLessons: 4,
    description: "Learn weather vocabulary and how to express emotions in everyday conversation",
  },
  {
    num: 9,
    title: "Maelekezo na Mtaani",
    title_sw: "Directions and the Community",
    icon: "🗺️",
    color: "#8b5cf6",
    firstLesson: "9-1",
    totalLessons: 4,
    description: "Learn how to ask for and give directions in your community",
  },
  {
    num: 10,
    title: "Kujitambulisha",
    title_sw: "Introducing Yourself and Your Work",
    icon: "👋",
    color: "#ec4899",
    firstLesson: "10-1",
    totalLessons: 4,
    description: "Learn how to introduce yourself, your job, and describe what you do",
  },
  {
    num: 11,
    title: "Interview Essentials",
    title_sw: "Misingi ya Mahojiano",
    icon: "🎯",
    color: "#818cf8",
    firstLesson: "11-1",
    totalLessons: 7,
    description: "Interview vocabulary, dialogues, workplace phrases, and final assessment",
  },
  {
    num: 12,
    title: "Mtihani wa Kutoka — Exit Exam",
    title_sw: "First Day at Work Simulation",
    icon: "🏆",
    color: "#34d399",
    firstLesson: "12-1",
    totalLessons: 3,
    description: "The final simulation. Prove you can hold a real professional conversation.",
  },
];

type ModuleLockSummary = {
  moduleNum: number;
  videoUrl: string | null;
};

function getVideoEmbed(videoUrl: string | null | undefined): { kind: "iframe" | "video"; src: string } | null {
  if (!videoUrl) return null;
  const trimmed = videoUrl.trim();
  const youTubeMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
  if (youTubeMatch) {
    return { kind: "iframe", src: `https://www.youtube.com/embed/${youTubeMatch[1]}` };
  }
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch) {
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { kind: "video", src: trimmed };
}

export default function PathMap() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<FoundationProgress | null>(null);
  const [moduleLocks, setModuleLocks] = useState<Record<number, ModuleLockSummary>>({});

  useEffect(() => {
    const syncProgress = () => setProgress(getFoundationProgress());
    syncProgress();
    window.addEventListener(FOUNDATION_PROGRESS_EVENT, syncProgress);

    fetch("/api/foundation/module-locks")
      .then((response) => response.json() as Promise<ModuleLockSummary[]>)
      .then((locks) => {
        setModuleLocks(Object.fromEntries(locks.map((lock) => [lock.moduleNum, lock])));
      })
      .catch(() => {});

    return () => {
      window.removeEventListener(FOUNDATION_PROGRESS_EVENT, syncProgress);
    };
  }, []);

  const completedModules = progress?.completedModules ?? [];
  const allDone = completedModules.length === TOTAL_MODULES;
  const activeVideoModule = Number(searchParams.get("video") ?? 0);
  const activeVideo = useMemo(
    () => getVideoEmbed(moduleLocks[activeVideoModule]?.videoUrl),
    [activeVideoModule, moduleLocks]
  );

  return (
    <div className="pm-wrap">
      <FoundationCommandCenter />

      <div className="pm-header">
        <p className="pm-eyebrow">Foundation Mode · Your Learning Path</p>
        <h1 className="pm-title">
          {allDone ? "🎓 Foundation Complete!" : "Your Journey to Lesson Mastery"}
        </h1>
        <p className="pm-sub">
          {allDone
            ? "You have completed all 12 modules. You are ready to graduate."
            : "Move lesson by lesson, unlock the next module, and keep Sofia's lesson guidance close."}
        </p>
      </div>

      <div className="pm-path">
        {MODULES.map((mod, idx) => {
          const unlocked = isModuleUnlocked(mod.num);
          const complete = isModuleComplete(mod.num);
          const score = getModuleScore(mod.num);
          const completedLessons = progress?.completedLessons.filter((id) => id.startsWith(`${mod.num}-`)).length ?? 0;
          const lessonPct = Math.round((completedLessons / mod.totalLessons) * 100);

          return (
            <div key={mod.num} className="pm-module-row">
              {idx > 0 && (
                <div
                  className={`pm-connector ${isModuleComplete(mod.num - 1) ? "pm-connector--done" : ""}`}
                  aria-hidden="true"
                />
              )}

              <div
                className={`pm-module ${complete ? "pm-module--complete" : ""} ${!unlocked ? "pm-module--locked" : ""}`}
                style={{ "--mod-color": mod.color } as React.CSSProperties}
              >
                <div className="pm-module-icon-wrap">
                  <div className="pm-module-icon">
                    {complete ? "✅" : !unlocked ? "🔒" : mod.icon}
                  </div>
                  <div className="pm-module-num">Module {mod.num}</div>
                </div>

                <div className="pm-module-info">
                  <h3 className="pm-module-title">{mod.title}</h3>
                  <p className="pm-module-title-sw">{mod.title_sw}</p>
                  <p className="pm-module-desc">{mod.description}</p>
                  {unlocked && !complete && (
                    <div className="pm-module-progress">
                      <div className="pm-module-bar">
                        <div className="pm-module-fill" style={{ width: `${lessonPct}%` }} />
                      </div>
                      <span className="pm-module-pct">{completedLessons}/{mod.totalLessons} lessons</span>
                    </div>
                  )}
                  {complete && score !== null && <p className="pm-module-score">Assessment score: {score}%</p>}
                </div>

                <div className="pm-module-action">
                  {unlocked ? (
                    <div className="pm-action-stack">
                      <Link
                        href={`/foundation/lesson/${mod.num}/${mod.firstLesson}`}
                        className={`pm-btn ${complete ? "pm-btn--review" : "pm-btn--start"}`}
                      >
                        {complete ? "Review" : completedLessons > 0 ? "Continue →" : "Start →"}
                      </Link>
                      {moduleLocks[mod.num]?.videoUrl && (
                        <button
                          type="button"
                          className="pm-btn pm-btn--video"
                          onClick={() => router.push(`/foundation?video=${mod.num}`)}
                        >
                          Watch Video
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="pm-locked-msg">Complete Module {mod.num - 1} first</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="pm-graduate">
          <div className="pm-graduate-inner">
            <p className="pm-graduate-eyebrow">All Modules Complete</p>
            <h2 className="pm-graduate-title">You Are Ready to Graduate</h2>
            <p className="pm-graduate-sub">
              Take the final Foundation Assessment with Sofia to unlock Hirely Coach and earn your
              <strong> Foundation Graduate badge</strong> + <strong>150 bonus IP</strong>.
            </p>
            <Link href="/foundation/graduate" className="pm-graduate-btn">
              🎓 Begin Graduation Assessment →
            </Link>
          </div>
        </div>
      )}

      {activeVideo && (
        <div className="pm-video-shell" role="dialog" aria-modal="true" aria-label="Lesson video player">
          <button
            type="button"
            className="pm-video-backdrop"
            onClick={() => router.replace(pathname)}
            aria-label="Close video player"
          />
          <div className="pm-video-card">
            <div className="pm-video-head">
              <div>
                <p className="pm-video-eyebrow">Video Player</p>
                <h2 className="pm-video-title">Module {activeVideoModule} Pronunciation Guide</h2>
              </div>
              <button type="button" className="pm-video-close" onClick={() => router.replace(pathname)}>
                Close
              </button>
            </div>
            {activeVideo.kind === "iframe" ? (
              <iframe
                src={activeVideo.src}
                title={`Module ${activeVideoModule} video`}
                className="pm-video-frame"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={activeVideo.src} controls className="pm-video-frame" />
            )}
          </div>
        </div>
      )}

      <style>{`
        .pm-wrap {
          max-width: 720px;
          margin: 0 auto;
          padding: 1rem 1.25rem 4rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .pm-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .pm-eyebrow {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #34d399;
          margin: 0;
        }
        .pm-title {
          font-size: clamp(1.5rem, 4vw, 2.2rem);
          font-weight: 900;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.03em;
        }
        .pm-sub {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
          line-height: 1.6;
        }
        .pm-path {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .pm-module-row {
          display: flex;
          flex-direction: column;
        }
        .pm-connector {
          width: 2px;
          height: 24px;
          background: rgba(255,255,255,0.06);
          margin-left: 27px;
        }
        .pm-connector--done {
          background: rgba(52, 211, 153, 0.3);
        }
        .pm-module {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 1rem;
          padding: 1.1rem 1.25rem;
          transition: border-color 0.2s;
        }
        .pm-module:not(.pm-module--locked):hover {
          border-color: color-mix(in srgb, var(--mod-color) 40%, transparent);
        }
        .pm-module--complete {
          border-color: rgba(52, 211, 153, 0.25);
          background: rgba(52, 211, 153, 0.04);
        }
        .pm-module--locked {
          opacity: 0.45;
        }
        .pm-module-icon-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          flex-shrink: 0;
        }
        .pm-module-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
        }
        .pm-module-num {
          font-size: 0.6rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .pm-module-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }
        .pm-module-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #e2e8f0;
          margin: 0;
        }
        .pm-module-title-sw {
          font-size: 0.72rem;
          color: #475569;
          font-style: italic;
          margin: 0;
        }
        .pm-module-desc {
          font-size: 0.78rem;
          color: #64748b;
          margin: 0.1rem 0 0;
          line-height: 1.4;
        }
        .pm-module-progress {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 0.4rem;
        }
        .pm-module-bar {
          flex: 1;
          height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
          overflow: hidden;
          max-width: 120px;
        }
        .pm-module-fill {
          height: 100%;
          background: var(--mod-color);
          border-radius: 999px;
          transition: width 0.4s ease;
        }
        .pm-module-pct {
          font-size: 0.68rem;
          color: #475569;
          white-space: nowrap;
        }
        .pm-module-score {
          font-size: 0.72rem;
          color: #34d399;
          margin: 0.2rem 0 0;
        }
        .pm-module-action {
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
        }
        .pm-action-stack {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          align-items: flex-end;
        }
        .pm-btn {
          display: inline-block;
          padding: 0.45rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .pm-btn--start {
          background: color-mix(in srgb, var(--mod-color) 15%, transparent);
          border: 1.5px solid color-mix(in srgb, var(--mod-color) 40%, transparent);
          color: var(--mod-color);
        }
        .pm-btn--start:hover {
          background: color-mix(in srgb, var(--mod-color) 25%, transparent);
        }
        .pm-btn--review {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #64748b;
        }
        .pm-btn--video {
          background: rgba(37,99,235,0.1);
          border: 1px solid rgba(37,99,235,0.25);
          color: #60a5fa;
          cursor: pointer;
        }
        .pm-locked-msg {
          font-size: 0.72rem;
          color: #334155;
        }
        .pm-graduate {
          background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(16,185,129,0.04));
          border: 1.5px solid rgba(52,211,153,0.25);
          border-radius: 1.25rem;
          padding: 2rem;
        }
        .pm-graduate-inner {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          align-items: flex-start;
        }
        .pm-graduate-eyebrow {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #34d399;
          margin: 0;
        }
        .pm-graduate-title {
          font-size: 1.4rem;
          font-weight: 900;
          color: #f1f5f9;
          margin: 0;
        }
        .pm-graduate-sub {
          font-size: 0.88rem;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
        }
        .pm-graduate-sub strong { color: #34d399; }
        .pm-graduate-btn {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.7rem 1.4rem;
          background: #34d399;
          border-radius: 0.6rem;
          font-size: 0.9rem;
          font-weight: 700;
          color: #0a0a0a;
          text-decoration: none;
          transition: all 0.15s;
        }
        .pm-graduate-btn:hover { background: #6ee7b7; }
        .pm-video-shell {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .pm-video-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(15,23,42,0.58);
          border: 0;
        }
        .pm-video-card {
          position: relative;
          width: min(840px, 100%);
          background: #0f172a;
          border-radius: 1.2rem;
          padding: 1rem;
          display: grid;
          gap: 0.9rem;
          box-shadow: 0 26px 60px rgba(15,23,42,0.4);
        }
        .pm-video-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .pm-video-eyebrow {
          margin: 0;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #5eead4;
          font-weight: 800;
        }
        .pm-video-title {
          margin: 0.25rem 0 0;
          font-size: 1.1rem;
          color: #f8fafc;
        }
        .pm-video-close {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: #f8fafc;
          padding: 0.55rem 0.9rem;
          cursor: pointer;
          font-weight: 700;
        }
        .pm-video-frame {
          width: 100%;
          aspect-ratio: 16 / 9;
          border: 0;
          border-radius: 0.9rem;
          background: #020617;
        }
        @media (max-width: 700px) {
          .pm-module {
            flex-direction: column;
            align-items: flex-start;
          }
          .pm-module-action {
            width: 100%;
            justify-content: stretch;
          }
          .pm-action-stack {
            width: 100%;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}
