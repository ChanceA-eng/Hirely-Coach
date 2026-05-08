"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FOUNDATION_PROGRESS_EVENT,
  TOTAL_MODULE_SEQUENCE,
  type FoundationProgress,
} from "@/app/lib/foundationProgress";
import { loadStreakState, applyDailyStreakBonus } from "@/app/lib/progression";
import "./page.css";

// ─── Module catalogue (matches PathMap + lesson router) ──────────────────
const MODULES = [
  { num: 1,  title: "The Sounds of Success",         title_sw: "Sauti za Mafanikio",               icon: "🔤", color: "#34d399", firstLesson: "1-1",  totalLessons: 26, description: "Phonics, the alphabet, and pronunciation" },
  { num: 2,  title: "Numbers and Colors",             title_sw: "Namba na Rangi",                    icon: "🔢", color: "#818cf8", firstLesson: "2-1",  totalLessons: 2,  description: "Count confidently and describe colors with visual examples" },
  { num: 3,  title: "Sound Mastery Lab",              title_sw: "Maabara ya Umilisi wa Sauti",       icon: "🗣", color: "#f59e0b", firstLesson: "3-1",  totalLessons: 4,  description: "Short and long vowels, digraphs, blends, and pronunciation tools" },
  { num: 4,  title: "Pronouns and Verbs",             title_sw: "Viwakilishi na Vitenzi",            icon: "🧠", color: "#f97316", firstLesson: "4-1",  totalLessons: 10, description: "Build sentence fluency with pronouns, verbs, and guided dialogues" },
  { num: 5,  title: "Food and Shopping",              title_sw: "Chakula na Ununuzi",                icon: "🛒", color: "#ec4899", firstLesson: "5-1",  totalLessons: 4,  description: "Food, shopping vocabulary, and real-world scenarios" },
  { num: 6,  title: "The Professional Vocabulary",    title_sw: "Msamiati wa Kitaaluma",             icon: "💼", color: "#f59e0b", firstLesson: "6-1",  totalLessons: 6,  description: "Office language, power verbs, and work communication" },
  { num: 7,  title: "Conversation Confidence",        title_sw: "Ujasiri wa Mazungumzo",             icon: "🎤", color: "#f472b6", firstLesson: "7-1",  totalLessons: 6,  description: "Dialogues, listening, speaking practice, and module completion" },
  { num: 8,  title: "Weather and Feelings",           title_sw: "Hali ya Hewa na Hisia",             icon: "🌤️", color: "#06b6d4", firstLesson: "8-1",  totalLessons: 4,  description: "Learn weather vocabulary and how to express emotions" },
  { num: 9,  title: "Directions and Community",       title_sw: "Maelekezo na Mtaani",               icon: "🗺️", color: "#8b5cf6", firstLesson: "9-1",  totalLessons: 4,  description: "Learn how to ask for and give directions in your community" },
  { num: 10, title: "Introducing Yourself",           title_sw: "Kujitambulisha",                    icon: "👋", color: "#ec4899", firstLesson: "10-1", totalLessons: 4,  description: "Introduce yourself, your work, and describe what you do" },
  { num: 11, title: "Interview Essentials",           title_sw: "Misingi ya Mahojiano",              icon: "🎯", color: "#818cf8", firstLesson: "11-1", totalLessons: 7,  description: "Interview vocabulary, dialogues, workplace phrases, and final assessment" },
  { num: 12, title: "Exit Exam",                      title_sw: "Mtihani wa Kutoka",                 icon: "🏆", color: "#34d399", firstLesson: "12-1", totalLessons: 3,  description: "The final simulation — prove you can hold a real professional conversation." },
] as const;

const AVAILABLE_BADGES = [
  { id: "phonics-pro",  name: "Pronunciation Pro",  icon: "🎤", unlock: "modules:3"  },
  { id: "conversation", name: "Conversation Ready", icon: "💬", unlock: "modules:6"  },
  { id: "interview",    name: "Interview Master",   icon: "💼", unlock: "modules:9"  },
  { id: "job-ready",    name: "Job Ready",          icon: "🏆", unlock: "modules:12" },
  { id: "streak-7",     name: "7-Day Streak",       icon: "🔥", unlock: "streak:7"   },
  { id: "streak-30",    name: "30-Day Champion",    icon: "⚡", unlock: "streak:30"  },
] as const;

function getUnlockedBadges(doneModules: number, streak: number) {
  return AVAILABLE_BADGES.filter((b) => {
    const [type, val] = b.unlock.split(":");
    if (type === "modules") return doneModules >= parseInt(val);
    if (type === "streak")  return streak >= parseInt(val);
    return false;
  });
}

type VideoLock = { moduleNum: number; videoUrl: string | null };
type FoundationProgressResponse = {
  foundation_progress?: FoundationProgress;
  foundation_override?: {
    unlocked_modules?: number[];
  };
};

function getVideoEmbed(url: string | null | undefined): { kind: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const t = url.trim();
  const yt = t.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = t.match(/vimeo\.com\/(\d+)/i);
  if (vm) return { kind: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  return { kind: "video", src: t };
}

const CIRC = 339.3; // 2π × 54

function FoundationHomeContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState<FoundationProgress | null>(null);
  const [streak, setStreak] = useState(0);
  const [videoLocks, setVideoLocks] = useState<Record<number, VideoLock>>({});
  const [overrideUnlockedModules, setOverrideUnlockedModules] = useState<number[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<typeof AVAILABLE_BADGES[number][]>([]);

  // Active video from query param
  const activeVideoNum = Number(searchParams.get("video") ?? 0);
  const activeVideo = useMemo(
    () => getVideoEmbed(videoLocks[activeVideoNum]?.videoUrl),
    [activeVideoNum, videoLocks]
  );

  async function syncProgress() {
    try {
      const res = await fetch("/api/foundation/progress", { cache: "no-store" });
      if (!res.ok) return;

      const payload = (await res.json()) as FoundationProgressResponse;
      const data = payload.foundation_progress ?? {
        completedLessons: [],
        completedModules: [],
        assessmentScores: {},
      };
      const unlockedModules = Array.isArray(payload.foundation_override?.unlocked_modules)
        ? payload.foundation_override.unlocked_modules
            .map(Number)
            .filter((moduleNum) => Number.isFinite(moduleNum) && moduleNum >= 1 && moduleNum <= 12)
        : [];

      setProgress(data);
      setOverrideUnlockedModules(unlockedModules);

      const st = loadStreakState();
      setUnlockedBadges(getUnlockedBadges(data.completedModules.length, st.streakDays));
    } catch {
      // Keep the existing UI state if fetch fails temporarily.
    }
  }

  useEffect(() => {
    // Tick daily login and read real streak
    const { streak: st } = applyDailyStreakBonus();
    setStreak(st.streakDays);

    void syncProgress();

    // Fetch video lock data from DB
    fetch("/api/foundation/module-locks")
      .then((r) => r.json() as Promise<VideoLock[]>)
      .then((locks) => setVideoLocks(Object.fromEntries(locks.map((l) => [l.moduleNum, l]))))
      .catch(() => {});

    const onProgressChanged = () => {
      void syncProgress();
    };
    window.addEventListener(FOUNDATION_PROGRESS_EVENT, onProgressChanged);
    return () => window.removeEventListener(FOUNDATION_PROGRESS_EVENT, onProgressChanged);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!progress) return null;

  const completedModulesArr = progress.completedModules;
  const totalModules        = TOTAL_MODULE_SEQUENCE.length;
  const doneCount           = completedModulesArr.length;
  const progressPct         = Math.round((doneCount / totalModules) * 100);
  const allDone             = TOTAL_MODULE_SEQUENCE.every((m) => completedModulesArr.includes(m));
  const hoursInvested       = Math.round(progress.completedLessons.length * 1.2);

  return (
    <main className="fp-root">
      {/* ── Ambient blobs ── */}
      <div className="fp-ambient" aria-hidden>
        <div className="fp-blob fp-blob--1" />
        <div className="fp-blob fp-blob--2" />
        <div className="fp-blob fp-blob--3" />
      </div>

      <div className="fp-shell">

        {/* ── Page header ── */}
        <header className="fp-page-header">
          <p className="fp-eyebrow">Foundation Mode · Your Learning Path</p>
          <h1 className="fp-page-title">
            {allDone ? "🎓 Foundation Complete!" : "Your Journey to Lesson Mastery"}
          </h1>
          <p className="fp-page-sub">
            {allDone
              ? "You have completed all 12 modules. You are ready to graduate."
              : `Move lesson by lesson, unlock the next module, and build real fluency.`}
          </p>
        </header>

        {/* ── Progress overview card ── */}
        <section className="fp-overview glass-card">
          <div className="fp-ring-wrap">
            <svg className="fp-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="54" fill="none" stroke="url(#fp-grad)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(progressPct / 100) * CIRC} ${CIRC}`}
                style={{ transition: "stroke-dasharray 0.7s ease" }}
              />
              <defs>
                <linearGradient id="fp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="fp-ring-text">
              <span className="fp-ring-pct">{progressPct}%</span>
              <span className="fp-ring-label">Complete</span>
            </div>
          </div>

          <div className="fp-pills">
            <div className="fp-pill">
              <span className="fp-pill-icon">⏱️</span>
              <div>
                <p className="fp-pill-label">Time Invested</p>
                <p className="fp-pill-value">{hoursInvested} hrs</p>
              </div>
            </div>
            <div className="fp-pill">
              <span className="fp-pill-icon">🔥</span>
              <div>
                <p className="fp-pill-label">Current Streak</p>
                <p className="fp-pill-value">{streak} {streak === 1 ? "day" : "days"}</p>
              </div>
            </div>
            <div className="fp-pill">
              <span className="fp-pill-icon">📚</span>
              <div>
                <p className="fp-pill-label">Lessons Done</p>
                <p className="fp-pill-value">{progress.completedLessons.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Module Path ── */}
        <section className="fp-section">
          <h2 className="fp-section-title">Learning Path</h2>
          <div className="fp-path">
            {MODULES.map((mod) => {
              const complete = completedModulesArr.includes(mod.num);
              const unlocked =
                mod.num === 1 ||
                overrideUnlockedModules.includes(mod.num) ||
                completedModulesArr.includes(mod.num - 1);
              const score    = progress.assessmentScores[`module-${mod.num}`] ?? null;
              const doneLessons = progress.completedLessons.filter((id) => id.startsWith(`${mod.num}-`)).length;
              const lessonPct   = Math.round((doneLessons / mod.totalLessons) * 100);
              const hasVideo    = !!videoLocks[mod.num]?.videoUrl;

              return (
                <div
                  key={mod.num}
                  className={[
                    "fp-mod",
                    complete ? "fp-mod--complete" : "",
                    !unlocked ? "fp-mod--locked" : "",
                  ].join(" ")}
                  style={{ "--mod-color": mod.color } as React.CSSProperties}
                >
                  <div className="fp-mod-head">
                    <div className="fp-mod-icon-col">
                      <div className="fp-mod-icon">
                        {complete ? "✅" : !unlocked ? "🔒" : mod.icon}
                      </div>
                      <div className="fp-mod-num">Module {mod.num}</div>
                    </div>

                    <div className="fp-mod-info">
                      <h3 className="fp-mod-title">{mod.title}</h3>
                      <p className="fp-mod-title-sw">{mod.title_sw}</p>
                    </div>
                  </div>

                  <p className="fp-mod-desc">{mod.description}</p>

                  {unlocked && !complete && (
                    <div className="fp-mod-progress">
                      <div className="fp-mod-bar">
                        <div
                          className="fp-mod-fill"
                          style={{ width: `${lessonPct}%`, background: mod.color }}
                        />
                      </div>
                      <span className="fp-mod-pct">{doneLessons}/{mod.totalLessons} lessons</span>
                    </div>
                  )}

                  {complete && doneLessons > 0 && (
                    <div className="fp-mod-progress">
                      <div className="fp-mod-bar">
                        <div className="fp-mod-fill" style={{ width: "100%", background: mod.color }} />
                      </div>
                      <span className="fp-mod-pct" style={{ color: mod.color }}>
                        {mod.totalLessons}/{mod.totalLessons} lessons ✓{score !== null ? ` · ${score}%` : ""}
                      </span>
                    </div>
                  )}

                  <div className="fp-mod-action">
                    {unlocked ? (
                      <div className="fp-action-stack">
                        <Link
                          href={`/foundation/lesson/${mod.num}/${mod.firstLesson}`}
                          className={`fp-btn ${complete ? "fp-btn--review" : "fp-btn--start"}`}
                          style={
                            complete
                              ? undefined
                              : {
                                  background: `color-mix(in srgb, ${mod.color} 14%, transparent)`,
                                  borderColor: `color-mix(in srgb, ${mod.color} 40%, transparent)`,
                                  color: mod.color,
                                }
                          }
                        >
                          {complete ? "Review" : doneLessons > 0 ? "Continue →" : "Start →"}
                        </Link>
                        {hasVideo && (
                          <button
                            type="button"
                            className="fp-btn fp-btn--video"
                            onClick={() => router.push(`${pathname}?video=${mod.num}`)}
                          >
                            Watch Video
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="fp-locked-msg">Complete Module {mod.num - 1} first</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Graduate CTA ── */}
        {allDone && (
          <section className="fp-graduate glass-card">
            <p className="fp-graduate-eyebrow">All Modules Complete</p>
            <h2 className="fp-graduate-title">You Are Ready to Graduate</h2>
            <p className="fp-graduate-sub">
              Take the final Foundation Assessment with Sofia to unlock Hirely Coach and earn your{" "}
              <strong>Foundation Graduate badge</strong> + <strong>150 bonus IP</strong>.
            </p>
            <Link href="/foundation/graduate" className="fp-graduate-btn">
              🎓 Begin Graduation Assessment →
            </Link>
          </section>
        )}

        {/* ── Achievements ── */}
        <section className="fp-section">
          <h2 className="fp-section-title">Achievements</h2>
          <div className="fp-badges">
            {AVAILABLE_BADGES.map((badge) => {
              const earned = unlockedBadges.some((b) => b.id === badge.id);
              return (
                <motion.div
                  key={badge.id}
                  className={`fp-badge ${earned ? "fp-badge--earned" : "fp-badge--locked"}`}
                  whileHover={earned ? { scale: 1.08 } : {}}
                  transition={{ type: "spring", stiffness: 220 }}
                >
                  <span className="fp-badge-icon">{badge.icon}</span>
                  <p className="fp-badge-name">{badge.name}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Certificate ── */}
        <section className="fp-section">
          <div className="fp-certificate glass-card">
            <div className="fp-cert-left">
              <span className="fp-cert-icon">📜</span>
              <div>
                <h3 className="fp-cert-title">Foundation Certificate</h3>
                <p className="fp-cert-desc">
                  {allDone
                    ? "Congratulations! All 12 modules complete."
                    : `${totalModules - doneCount} more module${totalModules - doneCount !== 1 ? "s" : ""} to unlock your certificate.`}
                </p>
              </div>
            </div>
            <button
              className={`fp-cert-btn ${allDone ? "fp-cert-btn--active" : ""}`}
              disabled={!allDone}
            >
              {allDone ? "Download Certificate" : "In Progress"}
            </button>
          </div>
        </section>

      </div>

      {/* ── Video modal ── */}
      {activeVideo && (
        <div className="fp-video-shell" role="dialog" aria-modal="true" aria-label="Lesson video player">
          <button
            type="button"
            className="fp-video-backdrop"
            onClick={() => router.replace(pathname)}
            aria-label="Close video player"
          />
          <div className="fp-video-card glass-card">
            <div className="fp-video-head">
              <div>
                <p className="fp-eyebrow">Video Player</p>
                <h2 className="fp-video-title">Module {activeVideoNum} Pronunciation Guide</h2>
              </div>
              <button type="button" className="fp-video-close" onClick={() => router.replace(pathname)}>
                ✕
              </button>
            </div>
            {activeVideo.kind === "iframe" ? (
              <iframe
                src={activeVideo.src}
                title={`Module ${activeVideoNum} video`}
                className="fp-video-frame"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={activeVideo.src} controls className="fp-video-frame" />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function FoundationHome() {
  return (
    <Suspense fallback={null}>
      <FoundationHomeContent />
    </Suspense>
  );
}
