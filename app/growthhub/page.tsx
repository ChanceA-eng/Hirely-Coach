"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import {
  loadGrowthHubSnapshot,
  loadInterviewHistory,
  migrateGuestDataToUser,
  XP_PER_LEVEL,
  type GrowthHubSnapshot,
} from "../lib/interviewStorage";
import "./page.css";

// ─── XP helpers (mirrors training page) ───────────────────────────────────
const XP_KEY = "hirelyCoachXP";

function loadXP(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(window.localStorage.getItem(XP_KEY) || "0", 10);
}

function xpLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function xpTitle(level: number): string {
  if (level < 3) return "Novice";
  if (level < 6) return "Apprentice";
  if (level < 10) return "Professional";
  if (level < 15) return "Senior";
  return "Executive";
}

// ─── STARR → readiness (weighted toward recent performance) ───────────────
function readiness(starrScore: number): number {
  return Math.min(100, Math.round(starrScore));
}

// ─── Session helpers ──────────────────────────────────────────────────────
function sessionJobTitle(session: { jobTitle?: string; job: string }): string {
  return session.jobTitle?.trim() || session.job.trim().split("\n")[0]?.trim().slice(0, 60) || "Interview Session";
}

function sessionLevel(session: { level?: string; questions: string[] }): string {
  if (session.level) return session.level;
  const n = session.questions.length;
  if (n <= 3) return "Quick";
  if (n <= 6) return "Medium";
  return "Intensive";
}

function levelVariant(level: string): "quick" | "medium" | "intensive" {
  const l = level.toLowerCase();
  if (l === "quick") return "quick";
  if (l === "medium") return "medium";
  return "intensive";
}

function extractWeakness(feedback: string): string {
  const idx = feedback.indexOf("### Areas for Improvement");
  const text = idx >= 0 ? feedback.slice(idx) : "";
  const m = text.match(/\*\*([^*]+)\*\*/);
  return m ? m[1] : "";
}

// ─── Focus Modal ──────────────────────────────────────────────────────────
type FocusModalData = { weakness: string; module: string; jobTitle: string };

function FocusModal({
  data,
  onClose,
}: {
  data: FocusModalData;
  onClose: () => void;
}) {
  return (
    <div className="gh-modal-overlay" onClick={onClose}>
      <div className="gh-modal" onClick={(e) => e.stopPropagation()}>
        <button className="gh-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <p className="gh-modal-label">Coach&apos;s Takeaway</p>
        <h3 className="gh-modal-title">
          {data.jobTitle}
        </h3>
        {data.weakness ? (
          <>
            <div className="gh-modal-weakness-pill">{data.weakness}</div>
            <p className="gh-modal-body">
              This skill area was flagged as a key opportunity. A targeted session in the Training Lab will sharpen your response quality.
            </p>
            <Link
              href="/training"
              className="gh-modal-cta"
              onClick={onClose}
            >
              Open {data.module} →
            </Link>
          </>
        ) : (
          <p className="gh-modal-body">
            Great performance on this session. Keep practicing to build interview confidence.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Weakness → training module label ─────────────────────────────────────
const WEAK_TO_MODULE: Record<string, string> = {
  "Quantify Your Results": "Quantifying Results",
  "Add More Context": "Situation Framing",
  "Clarify Your Role": "Task Ownership",
  "Take Personal Ownership": "Action Specificity",
  "Show Growth Mindset": "Reflection Depth",
  "Missing Results": "Quantifying Results",
  "Vague Task": "Task Ownership",
  "Missing Situation": "Situation Framing",
  "Weak Action": "Action Specificity",
  "Missing Reflection": "Reflection Depth",
  "Too Generic": "Situation Framing",
  "Unstructured Delivery": "Structured Communication",
  "No Measurable Impact": "Quantifying Results",
};

function weaknessToModule(weakness: string): string {
  for (const [key, val] of Object.entries(WEAK_TO_MODULE)) {
    if (weakness.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "Core STARR Fundamentals";
}

// ─── Circular SVG progress ────────────────────────────────────────────────
function ReadinessMeter({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - score / 100);

  const color =
    score >= 75 ? "#10b981" : score >= 50 ? "#3b82f6" : "#f59e0b";
  const scoreBand = score >= 75 ? "high" : score >= 50 ? "medium" : "low";

  return (
    <div className="gh-meter-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Track */}
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="10"
        />
        {/* Progress */}
        <motion.circle
          className={`gh-meter-progress gh-meter-progress--${scoreBand}`}
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          transform="rotate(-90 70 70)"
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
        {/* Score text */}
        <text
          x="70"
          y="66"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="22"
          fontWeight="700"
        >
          {score}
        </text>
        <text
          x="70"
          y="84"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="11"
        >
          / 100
        </text>
      </svg>
    </div>
  );
}

function SimulationIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="18" />
      <circle cx="14" cy="24" r="2" />
      <circle cx="24" cy="17" r="2" />
      <circle cx="34" cy="24" r="2" />
      <path d="M16 24L22 19L32 24" />
      <path d="M12 30C15 33 19 35 24 35C29 35 33 33 36 30" />
    </svg>
  );
}

function TrainingLabIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="10" r="3" />
      <circle cx="12" cy="18" r="3" />
      <circle cx="16" cy="33" r="3" />
      <circle cx="32" cy="33" r="3" />
      <circle cx="36" cy="18" r="3" />
      <path d="M24 13L12 18L16 33L32 33L36 18L24 13Z" />
      <path d="M12 18L32 33" />
      <path d="M36 18L16 33" />
      <path d="M24 10V24" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M9 12H30L38 20V36H9V12Z" />
      <path d="M30 12V20H38" />
      <ellipse cx="21" cy="17" rx="8" ry="2.5" />
      <path d="M13 17V30" />
      <path d="M29 17V30" />
      <path d="M13 22C13 23.4 16.6 24.5 21 24.5C25.4 24.5 29 23.4 29 22" />
      <path d="M13 27C13 28.4 16.6 29.5 21 29.5C25.4 29.5 29 28.4 29 27" />
      <path d="M35 30V23" />
      <path d="M35 30L31.5 26.5" />
      <path d="M35 30L38.5 26.5" />
    </svg>
  );
}

function NudgeIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M9 12H39V30H25L18 36V30H9V12Z" />
      <path d="M26 16L20 25H25L22 32L31 21H26L29 16H26Z" />
    </svg>
  );
}

function TargetingIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="14" />
      <circle cx="24" cy="24" r="8" />
      <circle cx="24" cy="24" r="2" />
      <path d="M24 4V12" />
      <path d="M24 36V44" />
      <path d="M4 24H12" />
      <path d="M36 24H44" />
    </svg>
  );
}

  function ProfileHubIcon() {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="17" r="7" />
        <path d="M8 42c0-8.837 7.163-16 16-16s16 7.163 16 16" />
        <path d="M30 22l4 4-8 8-4-4" />
      </svg>
    );
  }

function SchematicOrb() {
  return (
    <div className="gh-blueprint-orb" aria-hidden="true">
      <svg viewBox="0 0 180 180" className="gh-blueprint-svg" fill="none">
        <circle cx="90" cy="90" r="68" />
        <circle cx="90" cy="90" r="48" />
        <circle cx="90" cy="90" r="28" />
        <circle cx="90" cy="90" r="10" />
        <path d="M90 20V58" />
        <path d="M90 122V160" />
        <path d="M20 90H58" />
        <path d="M122 90H160" />
      </svg>
      <motion.span
        className="gh-signal-dot"
        animate={{ scale: [1, 1.2, 1], opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function ReadinessPill({ score }: { score: number }) {
  return <span className="gh-readiness-pill">{score}% Readiness</span>;
}

// ─── Action Card ─────────────────────────────────────────────────────────
function ActionCard({
  href,
  icon,
  title,
  desc,
  variant,
  delay,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
  variant: "simulation" | "training" | "archive" | "targeting" | "profile";
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`gh-action-card gh-action-card--${variant} glass-card`}
    >
      <Link href={href} className="gh-action-link">
        <div className="gh-card-header">
          <div className="gh-professional-icon">
            {icon}
          </div>
          <h3 className="gh-card-title">{title}</h3>
        </div>
        <p className="gh-card-desc">{desc}</p>
        <span className="gh-card-arrow">→</span>
      </Link>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
const PROFILE_DONE_KEY = "hirelyProfileDone";

export default function GrowthHubPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<GrowthHubSnapshot | null>(null);
  const [history, setHistory] = useState<ReturnType<typeof loadInterviewHistory>>([]);
  const [xp, setXp] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [focusModal, setFocusModal] = useState<FocusModalData | null>(null);

  useEffect(() => {
    // ── Onboarding gate: hard redirect if profile not confirmed ──
    const profileDone = localStorage.getItem(PROFILE_DONE_KEY);
    if (!profileDone) {
      router.replace("/onboarding");
      return;
    }

    // Migrate any guest interview data that was completed before sign-in.
    if (userId) { migrateGuestDataToUser(userId); }
    const snap = loadGrowthHubSnapshot(userId);
    const hist = loadInterviewHistory(userId);
    const storedXp = loadXP();

    setSnapshot(snap);
    setHistory(hist);
    setXp(storedXp);
    setHydrated(true);
  }, [userId, router]);

  const score = snapshot ? readiness(snapshot.starrScore) : 0;
  const module = snapshot?.topWeakness
    ? weaknessToModule(snapshot.topWeakness)
    : null;

  const isReturningUser = history.length > 0 && snapshot !== null;

  return (
    <div className="lp-root">
      <main className="gh-main">
        <AnimatePresence mode="wait">
          {!hydrated ? null : !isReturningUser ? (
            /* ── FIRST-TIME STATE ── */
            <motion.div
              key="new-journey"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="gh-first-time"
            >
              <div className="gh-first-layout">
                <section className="gh-terminal-box">
                  <h1 className="gh-first-h1">Your GrowthHub Terminal Is Ready</h1>
                  <p className="gh-first-sub">
                    Run your first mock interview to unlock readiness diagnostics, STARR coaching, and a tailored practice roadmap built for your next role.
                  </p>
                  <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                    <Link href="/voice?mode=new" className="gh-cta-box">
                      Start Practicing Now
                    </Link>
                  </motion.div>
                </section>

                <aside className="gh-blueprint-panel">
                  <SchematicOrb />
                </aside>
              </div>
            </motion.div>
          ) : (
            /* ── RETURNING USER DASHBOARD ── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="gh-dashboard"
            >
              {/* Header row */}
              <div className="gh-header-row">
                <div className="gh-header-left">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <p className="gh-eyebrow">COMMAND CENTER</p>
                    <div className="gh-title-row">
                      <h1 className="gh-h1">GrowthHub</h1>
                      <ReadinessPill score={score} />
                    </div>
                    {snapshot?.jobTitle && (
                      <p className="gh-session-meta">
                        Focusing on: <span>{snapshot.jobTitle}</span>
                      </p>
                    )}
                  </motion.div>
                </div>

                <motion.div
                  className="gh-meter-col"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <ReadinessMeter score={score} />
                  <p className="gh-meter-label">Global Readiness</p>
                  <p className="gh-meter-sub">
                    {score >= 75
                      ? "Interview-ready"
                      : score >= 50
                      ? "On track"
                      : "Needs practice"}
                  </p>
                </motion.div>
              </div>

              {/* Body: cards + sidebar */}
              <div className="gh-body">
                {/* Action grid */}
                <div className="gh-cards-col">
                  <motion.p
                    className="gh-section-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                     Modules
                  </motion.p>
                  <div className="gh-action-grid">
                    <ActionCard
                       href="/training"
                       icon={<TrainingLabIcon />}
                       title="The Accelerator"
                       desc="Targeted STARR drills and level-up training."
                       variant="training"
                      delay={0.1}
                    />
                    <ActionCard
                       href="/voice?mode=new"
                       icon={<SimulationIcon />}
                       title="The Simulator"
                       desc="Live mock interviews with AI feedback."
                       variant="simulation"
                      delay={0.2}
                    />
                    <ActionCard
                       href="/growthhub/targeting"
                       icon={<TargetingIcon />}
                       title="Targeting Array"
                       desc="KJ-matched roles ranked by fit score."
                       variant="targeting"
                      delay={0.3}
                    />
                    <ActionCard
                       href="/growthhub/profile"
                       icon={<ProfileHubIcon />}
                       title="Profile Hub"
                       desc="Manage your KJ, preferences, and account."
                       variant="profile"
                      delay={0.4}
                    />
                    <ActionCard
                       href="/history"
                       icon={<ArchiveIcon />}
                       title="Archive"
                       desc="Review past sessions, transcripts, and scores."
                       variant="archive"
                      delay={0.5}
                    />
                  </div>

                  {/* STARR breakdown strip */}
                  {snapshot && (
                    <motion.div
                      className="gh-score-strip glass-card"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.75 }}
                    >
                      <div className="gh-strip-left">
                        <span className="gh-strip-score">{snapshot.starrScore}</span>
                        <span className="gh-strip-label">STARR Score</span>
                      </div>
                      <div className="gh-strip-bar-track">
                        <motion.div
                          className="gh-strip-bar-fill"
                          animate={{ width: `${snapshot.starrScore}%` }}
                          transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                        />
                      </div>
                      <Link href="/training" className="gh-strip-cta">
                        Improve score →
                      </Link>
                    </motion.div>
                  )}

                  {history.length > 0 && (
                    <motion.div
                      className="gh-session-list glass-card"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.85 }}
                    >
                      <div className="gh-session-list-header">
                        <p className="gh-section-label">Previous Sessions</p>
                      </div>
                      {history.slice(0, 3).map((session) => {
                        const jt = sessionJobTitle(session);
                        const lvl = sessionLevel(session);
                        const lv = levelVariant(lvl);
                        const weakness = extractWeakness(session.feedback);
                        const mod = weakness ? weaknessToModule(weakness) : "";
                        const dateStr = new Date(session.createdAt).toLocaleDateString();
                        const score = session.starrScore;
                        return (
                          <div key={session.id} className="gh-session-row">
                            <div className="gh-session-row-main">
                              <p className="gh-session-row-title">{jt}</p>
                              <div className="gh-session-row-meta">
                                <span className={`gh-level-badge gh-level-badge--${lv}`}>{lvl}</span>
                                <span className="gh-session-row-date">{dateStr}</span>
                                {score != null && (
                                  <span className="gh-session-row-score">{score}/100</span>
                                )}
                              </div>
                            </div>
                            <button
                              className="gh-session-focus-btn"
                              onClick={() =>
                                setFocusModal({ weakness, module: mod, jobTitle: jt })
                              }
                            >
                              View Focus
                            </button>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>

                {/* Coach's nudge sidebar */}
                <motion.aside
                  className="gh-sidebar"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="gh-sidebar-card glass-card coach-nudge-box">
                    <div className="gh-nudge-header">
                      <div className="gh-professional-icon gh-professional-icon--nudge">
                        <NudgeIcon />
                      </div>
                      <div>
                        <p className="gh-nudge-title">Coach&apos;s Nudge</p>
                        <p className="gh-nudge-subtitle">Current Focus</p>
                      </div>
                    </div>
                    {snapshot?.topWeakness ? (
                      <div className="gh-nudge-content">
                        <div className="gh-weakness-pill">{snapshot.topWeakness}</div>
                        <p className="gh-nudge-text">
                          This area is holding back your readiness. A quick session in the lab will fix it.
                        </p>
                        {module && (
                          <Link href="/training" className="gh-nudge-cta">
                            Open {module} →
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p className="gh-nudge-text">Complete an interview to see your custom coaching path.</p>
                    )}
                  </div>

                  {/* Quick stats */}
                  <div className="gh-sidebar-card glass-card gh-stats-box">
                    <p className="gh-stats-title">Quick Stats</p>
                    <StatRow label="Simulations" value={history.length.toString()} />
                    <StatRow label="Global Rank" value={xpTitle(xpLevel(xp))} />
                    <StatRow label="Total XP" value={`${xp} XP`} />
                  </div>
                </motion.aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOCUS MODAL ── */}
      {focusModal && (
        <FocusModal data={focusModal} onClose={() => setFocusModal(null)} />
      )}
    </div>
  );
}

// ─── Helper subcomponent ──────────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
