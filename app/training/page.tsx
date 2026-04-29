/* ─────────────────────────────────────────────────────────────────────────
   Training (Accelerator) – Learning Modules Hub
   Cards redirect to /starr-lab?moduleType=... for the one-game experience.
──────────────────────────────────────────────────────────────────────── */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  CORE_MODULE_XP,
  REQUIRED_CORE_XP,
  hasCompletedAllTrainingModules,
  loadInterviewHistory,
  loadTrainingProgress,
  saveTrainingProgress,
  type TrainingModuleId,
} from "../lib/interviewStorage";
import { getProgressMeta, loadIP } from "../lib/progression";
import "./page.css";

// ─── XP storage ─────────────────────────────────────────────────────────────
const SKILL_XP_KEY = "hirelyCoachSkillXP";

type SkillXP = { logic: number; storytelling: number; delivery: number };

function loadSkillXP(): SkillXP {
  if (typeof window === "undefined") return { logic: 0, storytelling: 0, delivery: 0 };
  try {
    return (JSON.parse(window.localStorage.getItem(SKILL_XP_KEY) || "{}") as SkillXP) || { logic: 0, storytelling: 0, delivery: 0 };
  } catch { return { logic: 0, storytelling: 0, delivery: 0 }; }
}

// ─── Weakness parser ─────────────────────────────────────────────────────────
const WEAK_PATTERNS: { pattern: RegExp; label: string; tag: "S" | "T" | "A" | "R" | "Rf" }[] = [
  { pattern: /lack(ing)?\s+(of\s+)?results?|no\s+measurable|missing\s+result|vague\s+result|unclear\s+outcome/i, label: "Missing Results", tag: "R" },
  { pattern: /vague\s+task|unclear\s+task|no\s+task|missing\s+task/i, label: "Vague Task", tag: "T" },
  { pattern: /missing\s+situation|no\s+context|lacked?\s+context|no\s+situation/i, label: "Missing Situation", tag: "S" },
  { pattern: /weak\s+action|no\s+action|lacked?\s+action|vague\s+action/i, label: "Weak Action", tag: "A" },
  { pattern: /no\s+reflect|missing\s+reflect|lack\s+reflect/i, label: "Missing Reflection", tag: "Rf" },
  { pattern: /too\s+generic|not\s+specific|overly\s+general|generic\s+answer/i, label: "Too Generic", tag: "S" },
  { pattern: /rambl|unfocused|disorganized|no\s+structure|lacks?\s+structure/i, label: "Unstructured Delivery", tag: "A" },
  { pattern: /impact\s+(was\s+)?(unclear|missing|not\s+stated)|quantif(y|ied)|metric/i, label: "No Measurable Impact", tag: "R" },
];

type Weakness = { label: string; tag: "S" | "T" | "A" | "R" | "Rf" };

function parseWeaknesses(feedback: string): Weakness[] {
  return WEAK_PATTERNS.filter((p) => p.pattern.test(feedback)).map((p) => ({ label: p.label, tag: p.tag }));
}

/** Map weakness tags to the most-affected module. */
function weaknessToModuleId(weaknesses: Weakness[]): "logic" | "storytelling" | "delivery" | null {
  if (!weaknesses.length) return null;
  const c = { logic: 0, storytelling: 0, delivery: 0 };
  for (const w of weaknesses) {
    if (w.tag === "A") c.delivery++;
    else if (w.tag === "T") c.logic++;
    else c.storytelling++;
  }
  const max = Math.max(c.delivery, c.logic, c.storytelling);
  if (c.delivery === max) return "delivery";
  if (c.logic === max) return "logic";
  return "storytelling";
}

// ─── Coach tips ──────────────────────────────────────────────────────────────
const COACH_TIPS: Record<string, string[]> = {
  S: ["Paint the scene — recruiters want to picture your context!", "Set the stage with who, what, and when."],
  T: ["Your Task shows ownership. Be specific about what YOU were responsible for."],
  A: ["Actions win jobs. Walk the recruiter through exactly what you did, step by step."],
  R: ["Results are the punchline! Numbers speak louder than words — quantify if you can."],
  Rf: ["Reflection shows growth. What did YOU learn? What would you do differently?"],
  default: [
    "Your Actions were strong — let's sharpen those Results to win the recruiter over!",
    "Strong structure unlocks confidence. Keep practicing!",
    "Every module you complete earns XP and a sharper story.",
  ],
};

function pickTip(weaknesses: Weakness[]): string {
  if (weaknesses.length > 0) {
    const tips = COACH_TIPS[weaknesses[0].tag] ?? COACH_TIPS.default;
    return tips[Math.floor(Math.random() * tips.length)];
  }
  return COACH_TIPS.default[Math.floor(Math.random() * COACH_TIPS.default.length)];
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function LogicIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="4" />
      <circle cx="34" cy="14" r="4" />
      <circle cx="24" cy="34" r="4" />
      <path d="M18 14H30" />
      <path d="M17 17L21 30" />
      <path d="M31 17L27 30" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M10 10H23V38H10V10Z" />
      <path d="M25 10H38V38H25V10Z" />
      <path d="M16 16H20" />
      <path d="M28 16H34" />
      <path d="M16 22H20" />
      <path d="M28 22H34" />
      <path d="M16 28H20" />
      <path d="M28 28H34" />
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 8C20.7 8 18 10.7 18 14V23C18 26.3 20.7 29 24 29C27.3 29 30 26.3 30 23V14C30 10.7 27.3 8 24 8Z" />
      <path d="M14 22V23C14 28.5 18.5 33 24 33C29.5 33 34 28.5 34 23V22" />
      <path d="M24 33V40" />
      <path d="M19 40H29" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 9L41 39H7L24 9Z" />
      <path d="M24 18V29" />
      <circle cx="24" cy="34" r="1.8" />
    </svg>
  );
}

// ─── Module card config ──────────────────────────────────────────────────────
type ModuleCard = {
  id: "logic" | "storytelling" | "delivery";
  title: string;
  desc: string;
  icon: ReactNode;
  difficulty: string;
  color: string;
  skillKey: "logic" | "storytelling" | "delivery";
};

const MODULE_CARDS: ModuleCard[] = [
  {
    id: "logic",
    title: "Logic & Reasoning",
    desc: "Structure your thinking and nail technical questions.",
    icon: <LogicIcon />,
    difficulty: "Professional",
    color: "#f59e0b",
    skillKey: "logic",
  },
  {
    id: "storytelling",
    title: "Storytelling",
    desc: "Turn raw experience into compelling STARR narratives.",
    icon: <StoryIcon />,
    difficulty: "Novice",
    color: "#0ea5e9",
    skillKey: "storytelling",
  },
  {
    id: "delivery",
    title: "Delivery & Confidence",
    desc: "Own the room — pace, tone, and executive presence.",
    icon: <DeliveryIcon />,
    difficulty: "Executive",
    color: "#8b5cf6",
    skillKey: "delivery",
  },
];

// ─── Main component ──────────────────────────────────────────────────────────
export default function TrainingHubPage() {
  const router = useRouter();
  const { userId } = useAuth();

  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [globalXP, setGlobalXP] = useState(0);
  const [skillXP, setSkillXP] = useState<SkillXP>({ logic: 0, storytelling: 0, delivery: 0 });
  const [completedModules, setCompletedModules] = useState<Set<"logic" | "storytelling" | "delivery">>(new Set());
  const [hasSession, setHasSession] = useState(false);
  const [coachTip, setCoachTip] = useState("");
  const [tipVisible, setTipVisible] = useState(false);

  useEffect(() => {
    const history = loadInterviewHistory(userId);
    const latest = history[0] ?? null;
    const currentXP = loadIP();
    const skills = loadSkillXP();
    const progress = loadTrainingProgress(userId);

    const reconstructedCompleted = new Set<TrainingModuleId>(progress.completedModules);
    (Object.keys(CORE_MODULE_XP) as TrainingModuleId[]).forEach((moduleId) => {
      if ((skills[moduleId] || 0) >= CORE_MODULE_XP[moduleId]) {
        reconstructedCompleted.add(moduleId);
      }
    });

    if (reconstructedCompleted.size !== progress.completedModules.length) {
      saveTrainingProgress({ completedModules: Array.from(reconstructedCompleted) }, userId);
    }
    queueMicrotask(() => {
      setGlobalXP(currentXP);
      setSkillXP(skills);
      setCompletedModules(reconstructedCompleted);
      if (latest) {
        const w = parseWeaknesses(latest.feedback || "");
        setWeaknesses(w);
        setHasSession(true);
        setCoachTip(pickTip(w));
      } else {
        setCoachTip(pickTip([]));
      }
    });
    setTimeout(() => setTipVisible(true), 600);
  }, [userId]);

  const weakestModuleId = weaknessToModuleId(weaknesses);
  const progressMeta = getProgressMeta(globalXP);
  const coreCompleted = hasCompletedAllTrainingModules({ completedModules: Array.from(completedModules) });
  const coreXP = Array.from(completedModules).reduce((sum, moduleId) => sum + CORE_MODULE_XP[moduleId], 0);
  const advancedUnlocked = coreCompleted && coreXP >= REQUIRED_CORE_XP;

  return (
    <div className="lp-root">
      <main className="th-root">
        {userId && (
          <Link href="/growthhub" className="gh-back-link" style={{ marginBottom: 16 }}>
            ← GrowthHub
          </Link>
        )}

        {/* ── GLOBAL XP BAR ── */}
        <section className="xp-banner glass-card">
          <div className="xp-banner-left">
            <span className="xp-level-badge">IP</span>
            <div>
              <div className="xp-title">{progressMeta.tier.title}</div>
              <div className="xp-sub">
                {globalXP} IP total
                {progressMeta.nextTier ? ` · ${progressMeta.remainingToNext} IP to ${progressMeta.nextTier.title}` : " · Master tier reached"}
              </div>
            </div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${Math.round(progressMeta.progressPct)}%` }} />
            </div>
            <span className="xp-pct">{Math.round(progressMeta.progressPct)}%</span>
          </div>
        </section>

        {/* ── HEADER ── */}
        <div className="th-header">
          <div>
            <p className="eyebrow">Accelerator</p>
            <h1 className="lp-h2">Level Up Your Interview Game</h1>
            <p className="th-sub">
              {hasSession
                ? "Your last session has been analyzed. Targeted modules are waiting."
                : "Complete a mock interview to unlock personalized training."}
            </p>
          </div>
        </div>

        {/* ── WEAKNESS ALERT ── */}
        {weaknesses.length > 0 && (
          <div className="weakness-alert glass-card">
            <span className="weakness-icon" aria-hidden="true"><AlertIcon /></span>
            <div>
              <div className="weakness-title">Gaps detected in your last session</div>
              <div className="weakness-chips">
                {weaknesses.map((w) => (
                  <span key={w.label} className={`weakness-chip weakness-chip--${w.tag}`}>
                    <span className={`weakness-tag weakness-tag--${w.tag}`}>{w.tag}</span>
                    &nbsp;{w.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LEARNING MODULES ── */}
        <section className="th-section">
          <h2 className="th-section-title">Learning Modules</h2>
          <div className="th-card-grid">
            {MODULE_CARDS.map((card) => {
              const isWeakest = card.id === weakestModuleId;
              const isCompleted = completedModules.has(card.id);
              const sp = skillXP[card.skillKey] || 0;
              const moduleTarget = CORE_MODULE_XP[card.id];
              const spPct = Math.min(100, (sp / moduleTarget) * 100);

              return (
                <div
                  key={card.id}
                  className={`th-card th-card--${card.id} glass-card${isWeakest ? " th-card--weakest" : ""}`}
                  onClick={() => router.push(`/starr-lab?moduleType=${card.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  {isCompleted && <div className="th-completed-badge">Completed</div>}
                  {isWeakest && (
                    <div className="th-weakest-badge">⚠ Weakest Point – Focus Here</div>
                  )}
                  <div className="th-card-header">
                    <div className="th-card-icon">{card.icon}</div>
                    <h3 className="th-card-title">{card.title}</h3>
                  </div>
                  <p className="th-card-desc">{card.desc}</p>
                  <div className="th-card-meta">
                    <span className={`th-xp-reward th-xp-reward--${card.id}`}>+{CORE_MODULE_XP[card.id]} XP</span>
                    <span className="th-difficulty">{card.difficulty}</span>
                  </div>
                  <div className="th-skill-bar-wrap">
                    <div className="th-skill-bar-track">
                      <div
                        className={`th-skill-bar-fill th-skill-bar-fill--${card.id}`}
                        style={{ width: `${Math.round(spPct)}%` }}
                      />
                    </div>
                    <span className="th-skill-pct">{Math.min(sp, moduleTarget)} / {moduleTarget}</span>
                  </div>
                  <button
                    className={`th-start-btn th-start-btn--${card.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/starr-lab?moduleType=${card.id}`);
                    }}
                  >
                    {isCompleted ? "Review Module →" : "Start Learning →"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── ADVANCED UNLOCK ── */}
        <section className="th-section">
          <div className="starr-cta glass-card">
            <div className="starr-cta-left">
              <h2 className="th-section-title" style={{ marginBottom: 8 }}>Advanced Challenge Tier</h2>
              <p className="th-sub" style={{ margin: 0 }}>
                Complete all core modules to reach {REQUIRED_CORE_XP} XP and unlock harder game variants.
              </p>
              <p className="th-sub" style={{ marginTop: 8 }}>
                Progress: {coreXP} / {REQUIRED_CORE_XP} XP · {coreCompleted ? "All core modules complete" : "Core modules pending"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {MODULE_CARDS.map((card) => (
                <button
                  key={card.id}
                  className="lp-btn-ghost"
                  onClick={() => router.push(`/starr-lab?moduleType=${card.id}&tier=advanced`)}
                  disabled={!advancedUnlocked}
                  style={!advancedUnlocked ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                >
                  {advancedUnlocked ? `Hard ${card.title}` : `Locked: ${card.title}`}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── STARR LAB CTA ── */}
        <section className="th-section">
          <div className="starr-cta glass-card">
            <div className="starr-cta-left">
              <h2 className="th-section-title" style={{ marginBottom: 8 }}>STARR Lab</h2>
              <p className="th-sub" style={{ margin: 0 }}>
                Tag, rebuild, and master your interview stories in an immersive workspace.
              </p>
            </div>
            <button
              className="lp-btn-primary"
              onClick={() =>
                router.push(
                  `/starr-lab?moduleType=${weakestModuleId ?? "storytelling"}`
                )
              }
            >
              Open STARR Lab →
            </button>
          </div>
        </section>

        {/* ── ACTIONS ── */}
        <div className="th-actions">
          <button className="lp-btn-primary" onClick={() => router.push("/growthhub")}>
            ↩ Return to GrowthHub
          </button>
          <Link href="/history" className="lp-btn-ghost">View History</Link>
        </div>

      </main>

      {/* ── MENTOR FIGURE ── */}
      <div className={`mentor-wrap ${tipVisible ? "mentor-wrap--visible" : ""}`}>
        <div className="mentor-bubble glass-card">
          <span className="mentor-bubble-text">{coachTip}</span>
          <button
            className="mentor-bubble-refresh"
            title="New tip"
            onClick={() => setCoachTip(pickTip(weaknesses))}
          >↻</button>
        </div>
        <div className="mentor-avatar">
          <div className="mentor-orb">
            <div className="mentor-orb-ring" />
            <div className="mentor-orb-core">HC</div>
          </div>
          <div className="mentor-name">Coach</div>
        </div>
      </div>
    </div>
  );
}
