"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  backfillLegacySessionTitles,
  loadGrowthHubSnapshot,
  loadInterviewHistory,
  migrateGuestDataToUser,
  type GrowthHubSnapshot,
} from "../lib/interviewStorage";
import {
  EMPTY_INTERVIEW_PROGRESS,
  loadAccountInterviewProgress,
  snapshotFromProgress,
  type AccountInterviewProgress,
} from "../lib/interviewProgress";
import {
  loadImpactEntries,
  migrateGuestImpactEntriesToUser,
  saveImpactEntry,
  type ImpactEntry,
} from "../lib/impactLog";
import {
  applyDailyStreakBonus,
  awardImpactLedgerEntry,
  HARD_GATES,
  LEVELS,
  getProgressMeta,
  loadHighestResumeScore,
  loadIP,
  loadStreakState,
} from "../lib/progression";
import type { NotificationRecord } from "../lib/notifications";
import NotificationItem from "../components/NotificationItem";
import {
  buildCourseGateSignals,
  COURSE_CATALOG,
  getCourseLevelAccess,
  LEVEL_ORDER,
  loadCompletedCourses,
} from "../courses/data";
import "./page.css";

async function fetchServerImpactEntries(): Promise<ImpactEntry[]> {
  try {
    const res = await fetch("/api/user/impact-ledger");
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: ImpactEntry[] };
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

async function pushImpactEntriesToServer(entries: ImpactEntry[]) {
  try {
    await fetch("/api/user/impact-ledger", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
  } catch {
    // ignore sync failures
  }
}

// ─── XP helpers (mirrors training page) ───────────────────────────────────
// ─── STARR → readiness (weighted toward recent performance) ───────────────
function readiness(starrScore: number): number {
  return Math.min(100, Math.round(starrScore));
}

// ─── Session helpers ──────────────────────────────────────────────────────
function sessionJobTitle(session: { jobTitle?: string; job: string }): string {
  const stored = session.jobTitle?.trim();
  if (stored && !/^https?:\/\//i.test(stored)) return stored;
  const firstLine = session.job.trim().split("\n")[0]?.trim().slice(0, 60);
  if (firstLine && !/^https?:\/\//i.test(firstLine)) return firstLine;
  return "Target Job";
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

const PROFESSIONAL_TITLES: Record<(typeof LEVEL_ORDER)[number], string> = {
  Novice: "Associate",
  Apprentice: "Specialist",
  Candidate: "Elite Prospect",
  Professional: "Career Professional",
  Expert: "Systems Architect",
  Executive: "Strategic Leader",
  Advanced: "Principal Strategist",
  Master: "Industry Authority",
};

type LevelUpModalData = {
  level: (typeof LEVEL_ORDER)[number];
  title: string;
};

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
      <path d="M12 8H29L37 16V40H12V8Z" />
      <path d="M29 8V16H37" />
      <path d="M18 23H28" />
      <path d="M18 29H27" />
      <path d="M18 35H24" />
      <path d="M31 24C33.5 24 35.5 22 35.5 19.5" />
      <path d="M31 28C35.7 28 39.5 24.2 39.5 19.5" />
      <circle cx="31" cy="19.5" r="1.4" />
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

  function AcademyIcon() {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 8L8 18L24 28L40 18L24 8Z" />
        <path d="M14 23V33C17 36 20.5 37.5 24 37.5C27.5 37.5 31 36 34 33V23" />
        <path d="M40 18V30" />
        <circle cx="40" cy="32" r="2" />
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

function StreakRing({ streakDays }: { streakDays: number }) {
  const capped = Math.max(1, Math.min(streakDays, 14));
  const pct = Math.round((capped / 14) * 100);

  return (
    <div className="gh-streak-wrap" title="Consistency streak">
      <div className="gh-streak-ring" style={{ ["--streak-pct" as string]: `${pct}%` }}>
        <span className="gh-streak-flame" aria-hidden="true">🔥</span>
      </div>
      <span className="gh-streak-days">{streakDays}d</span>
    </div>
  );
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
  variant: "simulation" | "training" | "archive" | "targeting" | "profile" | "academy";
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
const MASTERY_UNLOCK_KEY = "hirely.mastery.unlocked.v1";
const MASTERY_EVENT_PENDING_KEY = "hirely.mastery.event.pending.v1";
const MASTERY_EVENT_SEEN_KEY = "hirely.mastery.event.seen.v1";

type VerificationProfilePayload = {
  profile?: { publicEnabled?: boolean; slug?: string; credentialId?: string };
};

type MasterProgress = {
  ipAchieved: boolean;
  interviewAchieved: boolean;
  resumeAchieved: boolean;
  currentInterviewScore: number;
  currentResumeScore: number;
};

type CoachRecommendation = {
  type: "SkillPath" | "PolishPath" | "HabitPath";
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
};

export default function GrowthHubPage() {
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<GrowthHubSnapshot | null>(null);
  const [history, setHistory] = useState<ReturnType<typeof loadInterviewHistory>>([]);
  const [impactEntries, setImpactEntries] = useState<ImpactEntry[]>([]);
  const [impactAction, setImpactAction] = useState("");
  const [impactProof, setImpactProof] = useState("");
  const [impactResult, setImpactResult] = useState("");
  const [impactMessage, setImpactMessage] = useState("");
  const [xp, setXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [focusModal, setFocusModal] = useState<FocusModalData | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<LevelUpModalData | null>(null);
  const [eliteModalOpen, setEliteModalOpen] = useState(false);
  const [publicPortfolioUrl, setPublicPortfolioUrl] = useState("");
  const [publicPortfolioEnabled, setPublicPortfolioEnabled] = useState(false);
  const [verificationCredentialId, setVerificationCredentialId] = useState("");
  const [copiedPortfolioUrl, setCopiedPortfolioUrl] = useState(false);
  const [masteryUnlocked, setMasteryUnlocked] = useState(false);
  const [certificateBusy, setCertificateBusy] = useState(false);
  const [certificateMessage, setCertificateMessage] = useState("");
  const [accountProgress, setAccountProgress] = useState<AccountInterviewProgress>(EMPTY_INTERVIEW_PROGRESS);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [masterProgress, setMasterProgress] = useState<MasterProgress>({
    ipAchieved: false,
    interviewAchieved: false,
    resumeAchieved: false,
    currentInterviewScore: 0,
    currentResumeScore: 0,
  });
  const [coachRoadmap, setCoachRoadmap] = useState<CoachRecommendation[]>([]);

  function profileCompletionPct(): number {
    if (typeof window === "undefined") return 0;
    try {
      const raw = window.localStorage.getItem("hirelyProfile");
      if (!raw) return 0;
      const profile = JSON.parse(raw) as Record<string, unknown>;
      const fields = [
        String(profile.currentJobTitle || "").trim(),
        String(profile.preferredRole || "").trim(),
        String(profile.city || "").trim(),
        String(profile.state || "").trim(),
        String(profile.zip || "").trim(),
      ];
      const listFields = [
        Array.isArray(profile.targetCompanies) ? profile.targetCompanies.length : 0,
        Array.isArray(profile.relocationPreferences) ? profile.relocationPreferences.length : 0,
      ];
      const completed = fields.filter(Boolean).length + listFields.filter((count) => count > 0).length;
      return Math.round((completed / 7) * 100);
    } catch {
      return 0;
    }
  }

  async function syncNotificationHeartbeat(payload?: { event?: "heartbeat" | "job-ready"; jobTitle?: string; company?: string }) {
    try {
      const latest = impactEntries[0];
      const response = await fetch("/api/user/notification-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: payload?.event || "heartbeat",
          jobTitle: payload?.jobTitle,
          company: payload?.company,
          snapshot: {
            displayName: user?.firstName || "Professional",
            totalIp: xp,
            currentStreak: streakDays,
            latestImpactAt: latest?.createdAt || 0,
            profileCompletionPct: profileCompletionPct(),
            targetJobCount: 1,
            latestImpactTitle: latest?.action || "",
            latestMockScore: Number(snapshot?.starrScore || accountProgress.latestStarrScore || 0),
            globalResumeScore: loadHighestResumeScore(),
          },
        }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        notifications?: NotificationRecord[];
        unreadCount?: number;
        rankUp?: boolean;
        rank?: string;
        masterProgress?: MasterProgress;
      };

      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      if (typeof data.unreadCount === "number") setUnreadCount(data.unreadCount);
      if (data.masterProgress) setMasterProgress(data.masterProgress);

      if (data.rankUp && (data.rank === "PROFESSIONAL" || data.rank === "MASTER")) {
        setLevelUpModal({
          level: data.rank === "MASTER" ? "Master" : "Executive",
          title: data.rank === "MASTER" ? "Industry Authority" : "Strategic Leader",
        });
      }
    } catch {
      // Non-blocking notifications
    }
  }

  async function markNotificationsRead(action: "mark-all-read" | "mark-read", id?: string) {
    try {
      await fetch("/api/user/notification-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });

      if (action === "mark-all-read") {
        setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
        setUnreadCount(0);
      } else if (id) {
        setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
  }

  async function loadCoachRecommendations() {
    try {
      const response = await fetch("/api/coach/recommendations", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { recommendations?: CoachRecommendation[] };
      if (Array.isArray(data.recommendations)) {
        setCoachRoadmap(data.recommendations.slice(0, 3));
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;

    // ── Onboarding gate: hard redirect if profile not confirmed ──
    const profileDone = localStorage.getItem(PROFILE_DONE_KEY);
    if (!profileDone) {
      router.replace("/onboarding");
      return;
    }

    // Migrate any guest interview data that was completed before sign-in.
    if (userId) { migrateGuestDataToUser(userId); }
    if (userId) { migrateGuestImpactEntriesToUser(userId); }
    const localSnap = loadGrowthHubSnapshot(userId);
    const hist = loadInterviewHistory(userId);
    const impacts = loadImpactEntries(userId);
    const storedIp = loadIP();
    const streakUpdate = applyDailyStreakBonus();
    const fallbackStreak = loadStreakState();
    const effectiveIp = Math.max(storedIp, streakUpdate.ip);

    if (userId) {
      loadAccountInterviewProgress()
        .then((progress) => {
          if (cancelled) return;
          setAccountProgress(progress);
          const fallbackSnap = localSnap ?? snapshotFromProgress(progress);
          setSnapshot(fallbackSnap);
        })
        .catch(() => {
          if (cancelled) return;
          setAccountProgress(EMPTY_INTERVIEW_PROGRESS);
          setSnapshot(localSnap);
        })
        .finally(async () => {
          if (cancelled) return;
          const serverEntries = await fetchServerImpactEntries();
          const mergedEntries = [...serverEntries, ...impacts]
            .filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index)
            .sort((left, right) => right.createdAt - left.createdAt)
            .slice(0, 40);

          if (!cancelled) {
            if (mergedEntries.length) {
              await pushImpactEntriesToServer(mergedEntries);
            }
            setImpactEntries(mergedEntries);
          }

          setHistory(hist);
          setXp(effectiveIp);
          setStreakDays((streakUpdate.streak.streakDays || fallbackStreak.streakDays || 0));
          setHydrated(true);
        });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setAccountProgress(EMPTY_INTERVIEW_PROGRESS);
      setSnapshot(localSnap);
      setHistory(hist);
      setImpactEntries(impacts);
      setXp(effectiveIp);
      setStreakDays((streakUpdate.streak.streakDays || fallbackStreak.streakDays || 0));
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, router]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const changed = await backfillLegacySessionTitles(userId);
      if (!cancelled && changed > 0) {
        queueMicrotask(() => {
          setHistory(loadInterviewHistory(userId));
          setSnapshot(loadGrowthHubSnapshot(userId));
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveImpactLogEntry = async () => {
    const savedEntry = saveImpactEntry(
      {
        action: impactAction,
        proof: impactProof,
        result: impactResult,
      },
      userId
    );

    if (!savedEntry) {
      setImpactMessage("Complete all three fields to save the win.");
      return;
    }

    const nextEntries = loadImpactEntries(userId);
    setImpactEntries(nextEntries);

    const reward = awardImpactLedgerEntry(savedEntry.id);
    if (reward.awarded) {
      setXp(reward.ip);
    }

    if (userId) {
      await pushImpactEntriesToServer(nextEntries);
    }
    setImpactAction("");
    setImpactProof("");
    setImpactResult("");
    setImpactMessage(reward.awarded ? "Impact saved. +5 IP added." : "Impact saved.");
    // Trigger fresh notification generation so the new win surfaces in the feed
    void syncNotificationHeartbeat();
  };

  const score = snapshot ? readiness(snapshot.starrScore) : 0;
  const focusModule = snapshot?.topWeakness
    ? weaknessToModule(snapshot.topWeakness)
    : null;

  const isReturningUser = Boolean(snapshot) || history.length > 0 || accountProgress.hasCompletedInterview;
  const progressMeta = getProgressMeta(xp);
  const completedCourses = hydrated ? loadCompletedCourses() : new Set<string>();
  const totalCourses = COURSE_CATALOG.length;
  const completedCourseCount = completedCourses.size;
  const allCoursesComplete = completedCourseCount >= totalCourses;
  const certificateUnlocked = allCoursesComplete && xp > 10000;
  const gateSignals = buildCourseGateSignals(completedCourses, userId);
  const { access, levelGateDetails } = getCourseLevelAccess(xp, gateSignals);
  const unlockedLevels = LEVEL_ORDER.filter((level) => access.get(level));
  const attainedLevel = unlockedLevels.length
    ? unlockedLevels[unlockedLevels.length - 1]
    : "Novice";
  const nextLockedLevel = LEVEL_ORDER.find((level) => !(access.get(level) ?? false)) || null;
  const minIpByLevel = new Map(LEVELS.map((level) => [level.title, level.minIp]));
  const nextLockedMinIp = nextLockedLevel ? minIpByLevel.get(nextLockedLevel) ?? 0 : 0;

  const nextRecommendedCourse = COURSE_CATALOG.find((course) => {
    const levelUnlocked = access.get(course.level) ?? false;
    const prereqMet = !course.prerequisiteCourseId || completedCourses.has(course.prerequisiteCourseId);
    return levelUnlocked && prereqMet && !completedCourses.has(course.id);
  });

  const completedSimulations = history.filter((session) => {
    const answered = session.answers.filter((answer) => String(answer || "").trim().length >= 20).length;
    const totalChars = session.answers.reduce((sum, answer) => sum + String(answer || "").trim().length, 0);
    return answered >= 3 && totalChars >= 240;
  }).length;

  const promotionPending = Boolean(nextLockedLevel && xp >= nextLockedMinIp);
  const promotionGateDetail = nextLockedLevel ? levelGateDetails.get(nextLockedLevel) || "" : "";
  const alumniStatus = masteryUnlocked && attainedLevel === "Master";

  async function copyPortfolioUrl() {
    if (!publicPortfolioUrl) return;
    try {
      await navigator.clipboard.writeText(publicPortfolioUrl);
      setCopiedPortfolioUrl(true);
      setTimeout(() => setCopiedPortfolioUrl(false), 1400);
    } catch {
      setCopiedPortfolioUrl(false);
    }
  }

  async function downloadMasterCertificate() {
    if (!certificateUnlocked) {
      setCertificateMessage("The path to Mastery is built on Impact. Keep logging wins to earn your credential.");
      return;
    }

    setCertificateBusy(true);
    setCertificateMessage("");

    try {
      const verificationRes = await fetch("/api/user/verification-profile");
      let credentialId = verificationCredentialId;
      if (verificationRes.ok) {
        const data = (await verificationRes.json()) as VerificationProfilePayload;
        credentialId = String(data.profile?.credentialId || credentialId || "").trim();
      }

      if (!credentialId) {
        const fallbackSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        credentialId = `HC-2026-${fallbackSeed.toUpperCase()}`;
      }

      const verifyUrl = `https://hirelycoach.com/verify/${encodeURIComponent(credentialId)}`;

      const [{ default: QRCode }, { jsPDF }] = await Promise.all([
        import("qrcode"),
        import("jspdf"),
      ]);

      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 360,
      });

      const canvas = document.createElement("canvas");
      canvas.width = 2480;
      canvas.height = 3508;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      ctx.fillStyle = "#f5f1e6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 1400; i += 1) {
        const alpha = Math.random() * 0.035;
        ctx.fillStyle = `rgba(106, 84, 58, ${alpha.toFixed(3)})`;
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2.2;
        ctx.fillRect(x, y, size, size);
      }

      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 6;
      ctx.strokeRect(120, 120, canvas.width - 240, canvas.height - 240);
      ctx.lineWidth = 2;
      ctx.strokeRect(150, 150, canvas.width - 300, canvas.height - 300);

      const corner = 86;
      const drawCorner = (x: number, y: number, dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * corner);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * corner, y);
        ctx.stroke();
      };
      ctx.lineWidth = 4;
      drawCorner(180, 180, 1, 1);
      drawCorner(canvas.width - 180, 180, -1, 1);
      drawCorner(180, canvas.height - 180, 1, -1);
      drawCorner(canvas.width - 180, canvas.height - 180, -1, -1);

      ctx.fillStyle = "#111827";
      ctx.textAlign = "center";
      ctx.font = "600 42px 'Times New Roman', serif";
      ctx.fillText("HIRELY COACH ACADEMY OF PROFESSIONAL EXCELLENCE", canvas.width / 2, 360);

      ctx.font = "700 122px 'Times New Roman', serif";
      ctx.fillText("MASTER OF PROFESSIONAL STRATEGY", canvas.width / 2, 620);

      const fullName = [user?.firstName || "", user?.lastName || ""].filter(Boolean).join(" ") || "Hirely Coach Professional";
      ctx.font = "600 84px Georgia, serif";
      ctx.fillText(fullName, canvas.width / 2, 860);

      ctx.font = "italic 40px Georgia, serif";
      ctx.fillStyle = "#334155";
      const why = "For achieving the rank of Master through verified impact, systemic optimization, and executive leadership.";
      ctx.fillText(why, canvas.width / 2, 980);

      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.font = "500 34px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillText(`Total IP Earned: ${xp}  |  Impact Wins Verified: ${impactEntries.length}`, 230, 3110);

      ctx.font = "500 28px 'Courier New', monospace";
      ctx.fillText(`Unique Credential ID: ${credentialId}`, 230, 3195);

      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error("QR image failed"));
        qrImg.src = qrDataUrl;
      });
      ctx.drawImage(qrImg, canvas.width - 640, canvas.height - 720, 360, 360);

      ctx.textAlign = "center";
      ctx.font = "500 24px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText("Scan to verify credential and performance portfolio", canvas.width - 460, canvas.height - 330);

      const sealX = canvas.width - 430;
      const sealY = canvas.height - 230;
      ctx.beginPath();
      ctx.arc(sealX, sealY, 120, 0, Math.PI * 2);
      ctx.fillStyle = "#c9972b";
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#f5d27a";
      ctx.stroke();
      ctx.fillStyle = "#fff7dd";
      ctx.font = "700 30px 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.fillText("MASTER", sealX, sealY - 4);
      ctx.font = "600 18px 'Helvetica Neue', Arial, sans-serif";
      ctx.fillText("STAMP OF EXCELLENCE", sealX, sealY + 28);

      const image = canvas.toDataURL("image/png", 1);
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(image, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
      pdf.save(`hirely-master-certificate-${credentialId}.pdf`);
      setCertificateMessage("Master Certificate generated.");
    } catch {
      setCertificateMessage("Could not generate certificate. Please try again.");
    } finally {
      setCertificateBusy(false);
    }
  }

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const unlocked = window.localStorage.getItem(MASTERY_UNLOCK_KEY) === "1";
    const pending = window.localStorage.getItem(MASTERY_EVENT_PENDING_KEY);
    const seen = window.localStorage.getItem(MASTERY_EVENT_SEEN_KEY);

    queueMicrotask(() => {
      setMasteryUnlocked(unlocked);
      if (unlocked && pending && seen !== pending) {
        setEliteModalOpen(true);
      }
    });
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    async function loadVerification() {
      try {
        const res = await fetch("/api/user/verification-profile");
        if (!res.ok) return;
        const data = (await res.json()) as VerificationProfilePayload;
        const slug = String(data.profile?.slug || "").trim();
        const credentialId = String(data.profile?.credentialId || "").trim();
        const enabled = Boolean(data.profile?.publicEnabled);
        setVerificationCredentialId(credentialId);
        const pathId = credentialId || slug;
        setPublicPortfolioEnabled(enabled && pathId.length > 0);
        if (enabled && pathId.length > 0 && typeof window !== "undefined") {
          setPublicPortfolioUrl(`${window.location.origin}/verify/${pathId}`);
        }
      } catch {
        // ignore
      }
    }

    void loadVerification();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const key = "hirely.level.current.v1";
    const previousLevel = window.localStorage.getItem(key);
    if (previousLevel !== attainedLevel) {
      if (previousLevel) {
        setTimeout(() => {
          setLevelUpModal({
            level: attainedLevel,
            title: PROFESSIONAL_TITLES[attainedLevel],
          });
        }, 0);
      }
      window.localStorage.setItem(key, attainedLevel);
    }
  }, [attainedLevel, hydrated]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    void syncNotificationHeartbeat();
    void loadCoachRecommendations();
  }, [hydrated, userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    void syncNotificationHeartbeat();
  }, [xp, streakDays, impactEntries, hydrated, userId]);

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
                      <StreakRing streakDays={streakDays} />
                      <div className="gh-notif-wrap">
                        <button
                          type="button"
                          className="gh-notif-bell"
                          onClick={() => setNotifOpen((prev) => !prev)}
                          aria-label="Open action feed"
                          aria-expanded={notifOpen}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                          {unreadCount > 0 && (
                            <span className="gh-notif-dot" aria-label={`${unreadCount} unread`}>
                              {Math.min(unreadCount, 9)}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="gh-ip-banner" aria-label="Professional progression">
                      <div className="gh-ip-head">
                        <strong>
                          {alumniStatus
                            ? "Hirely Coach Alumni / Master"
                            : `${attainedLevel} · ${PROFESSIONAL_TITLES[attainedLevel]}`}
                        </strong>
                        <span>{xp} IP</span>
                      </div>
                      <div className={`gh-ip-track${promotionPending ? " gh-ip-track--gold" : ""}`}>
                        <span className="gh-ip-fill" style={{ width: `${progressMeta.progressPct}%` }} />
                      </div>
                      {promotionPending ? (
                        <p className="gh-ip-note gh-ip-note--pending">
                          {nextLockedLevel ? HARD_GATES[nextLockedLevel]?.promotionMessage : "Promotion pending."} ({promotionGateDetail})
                        </p>
                      ) : (
                        <p className="gh-ip-note">
                          {nextLockedLevel
                            ? `${Math.max(0, nextLockedMinIp - xp)} IP to ${nextLockedLevel}`
                            : "Master tier unlocked"}
                        </p>
                      )}
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
                    <ActionCard
                       href="/upload"
                       icon={<NudgeIcon />}
                        title="Resume Optimizer"
                        desc="Scan your resume, get prioritized fixes, and re-scan for score gains."
                       variant="training"
                      delay={0.6}
                    />
                    <ActionCard
                       href="/courses"
                       icon={<AcademyIcon />}
                       title="Hirely Academy"
                       desc={nextRecommendedCourse
                        ? `Next Recommended Lesson: ${nextRecommendedCourse.title}`
                        : "All currently unlocked lessons are complete. Keep earning IP to open the next tier."}
                       variant="academy"
                      delay={0.7}
                    />
                  </div>

                  {/* ── Weekly Milestone Log ── */}
                  <motion.section
                    className="gh-wins-section"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.72 }}
                  >
                    <div className="gh-wins-top">
                      <div>
                        <p className="gh-section-label">Weekly Milestone Log</p>
                        <p className="gh-wins-sub">
                          {alumniStatus
                            ? "You've reached Mastery. Log your latest win to maintain your Authority Score."
                            : "What did you move the needle on this week? Each entry builds your professional archive."}
                        </p>
                      </div>
                    </div>

                    {/* Input form */}
                    <div className="gh-wins-form glass-card">
                      <div className="gh-wins-form-grid">
                        <div className="gh-wins-field">
                          <label className="gh-wins-field-label" htmlFor="gh-impact-action">The Action</label>
                          <textarea
                            id="gh-impact-action"
                            className="gh-impact-input"
                            value={impactAction}
                            onChange={(event) => setImpactAction(event.target.value)}
                            placeholder="What did you complete or lead this week?"
                          />
                        </div>
                        <div className="gh-wins-field">
                          <label className="gh-wins-field-label" htmlFor="gh-impact-proof">The Proof</label>
                          <textarea
                            id="gh-impact-proof"
                            className="gh-impact-input"
                            value={impactProof}
                            onChange={(event) => setImpactProof(event.target.value)}
                            placeholder="Numbers: time saved, people helped, revenue, metrics."
                          />
                        </div>
                        <div className="gh-wins-field">
                          <label className="gh-wins-field-label" htmlFor="gh-impact-result">The Result</label>
                          <textarea
                            id="gh-impact-result"
                            className="gh-impact-input"
                            value={impactResult}
                            onChange={(event) => setImpactResult(event.target.value)}
                            placeholder="What was the final positive outcome?"
                          />
                        </div>
                      </div>
                      <div className="gh-wins-form-footer">
                        <button className="gh-impact-save" onClick={saveImpactLogEntry}>
                          Log This Win
                        </button>
                        {impactMessage && <p className="gh-impact-message">{impactMessage}</p>}
                      </div>
                    </div>

                    {/* Win cards timeline */}
                    <div className="gh-wins-timeline">
                      {impactEntries.length === 0 ? (
                        <div className="gh-wins-empty">
                          <p className="gh-wins-empty-title">No wins logged yet this week.</p>
                          <p className="gh-wins-empty-sub">What did you move the needle on today?</p>
                        </div>
                      ) : (
                        impactEntries.slice(0, 5).map((entry) => {
                          const isFresh = Date.now() - entry.createdAt < 24 * 60 * 60 * 1000;
                          const dateLabel = new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                          });
                          return (
                            <div
                              key={entry.id}
                              className={`gh-win-card${isFresh ? " gh-win-card--fresh" : ""}`}
                            >
                              <div className="gh-win-card-header">
                                <p className="gh-win-card-action">{entry.action}</p>
                                <span className="gh-win-card-date">{dateLabel}</span>
                              </div>
                              <p className="gh-win-card-proof">{entry.proof}</p>
                              <p className="gh-win-card-result">{entry.result}</p>
                              {isFresh && (
                                <span className="gh-win-card-fresh-tag">Just logged</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.section>

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
                        {focusModule && (
                          <Link href="/training" className="gh-nudge-cta">
                            Open {focusModule} →
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
                    <StatRow label="Simulations" value={`${completedSimulations} qualified`} />
                    <StatRow
                      label="Status"
                      value={
                        alumniStatus
                          ? "Hirely Coach Alumni / Master"
                          : `${attainedLevel} · ${PROFESSIONAL_TITLES[attainedLevel]}`
                      }
                    />
                    <StatRow label="Total IP" value={`${xp} IP`} />
                  </div>

                  <div className="gh-sidebar-card glass-card gh-master-progress-card">
                    <p className="gh-stats-title">Master Progress</p>
                    <div className="gh-master-checklist">
                      <p className={masterProgress.ipAchieved ? "gh-master-check is-done" : "gh-master-check"}>
                        {masterProgress.ipAchieved ? "[X]" : "[ ]"} IP Achieved
                      </p>
                      <p className={masterProgress.interviewAchieved ? "gh-master-check is-done" : "gh-master-check"}>
                        {masterProgress.interviewAchieved ? "[X]" : "[ ]"} 85%+ Interview Score (Current: {masterProgress.currentInterviewScore}%)
                      </p>
                      <p className={masterProgress.resumeAchieved ? "gh-master-check is-done" : "gh-master-check"}>
                        {masterProgress.resumeAchieved ? "[X]" : "[ ]"} 90%+ Global Rating (Current: {masterProgress.currentResumeScore}%)
                      </p>
                    </div>
                  </div>

                  <div className="gh-sidebar-card glass-card gh-roadmap-card">
                    <p className="gh-stats-title">Personalized Roadmap</p>
                    {coachRoadmap.length === 0 ? (
                      <p className="gh-sidebar-body">Loading your rank-aware recommendations...</p>
                    ) : (
                      <div className="gh-roadmap-list">
                        {coachRoadmap.map((item) => (
                          <Link key={item.type} href={item.ctaHref} className="gh-roadmap-item">
                            <strong>{item.title}</strong>
                            <span>{item.message}</span>
                            <em>{item.ctaLabel} →</em>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="gh-sidebar-card glass-card gh-cert-card">
                    <p className="gh-stats-title">Master Certificate</p>
                    {certificateUnlocked ? (
                      <button
                        type="button"
                        className="gh-cert-btn"
                        onClick={downloadMasterCertificate}
                        disabled={certificateBusy}
                      >
                        {certificateBusy ? "Generating..." : "Download Certificate"}
                      </button>
                    ) : (
                      <div className="gh-cert-locked">
                        <strong>Locked</strong>
                        <p>The path to Mastery is built on Impact. Keep logging wins to earn your credential.</p>
                        <p className="gh-cert-progress">{completedCourseCount}/{totalCourses} courses complete · {xp}/10001 IP</p>
                      </div>
                    )}
                    {certificateMessage && <p className="gh-cert-msg">{certificateMessage}</p>}
                  </div>

                  {alumniStatus && (
                    <div className="gh-sidebar-card glass-card gh-legacy-card">
                      <p className="gh-stats-title">Legacy Mode</p>
                      <p className="gh-sidebar-body">
                        Passive attraction activated. Focus on market signal leadership and selective executive search opportunities.
                      </p>
                      <div className="gh-legacy-list">
                        <Link href="/growthhub/targeting" className="gh-legacy-link">
                          View high-level market trend mapping
                        </Link>
                        <a href="https://www.heidrick.com/en/what-we-do/executive-search" target="_blank" rel="noreferrer" className="gh-legacy-link">
                          Heidrick & Struggles executive search
                        </a>
                        <a href="https://www.spencerstuart.com/what-we-do/executive-search" target="_blank" rel="noreferrer" className="gh-legacy-link">
                          Spencer Stuart executive search
                        </a>
                      </div>
                      <div className="gh-portfolio-box">
                        <p className="gh-sidebar-focus-label">Verified Public Portfolio</p>
                        {publicPortfolioEnabled && publicPortfolioUrl ? (
                          <>
                            <a href={publicPortfolioUrl} className="gh-portfolio-link" target="_blank" rel="noreferrer">
                              {publicPortfolioUrl}
                            </a>
                            <button type="button" className="gh-copy-btn" onClick={copyPortfolioUrl}>
                              {copiedPortfolioUrl ? "Copied" : "Copy URL"}
                            </button>
                          </>
                        ) : (
                          <Link href="/growthhub/profile" className="gh-legacy-link">
                            Unlock your read-only public URL in Profile Hub
                          </Link>
                        )}
                      </div>

                    </div>
                  )}

                </motion.aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── ACTION FEED DRAWER ── */}
      {notifOpen && (
        <>
          <div
            className="gh-feed-backdrop"
            onClick={() => setNotifOpen(false)}
            aria-hidden="true"
          />
          <aside className="gh-feed-drawer" role="dialog" aria-modal="true" aria-label="Action Feed">
            <div className="gh-feed-header">
              <div className="gh-feed-header-left">
                <span className="gh-feed-title">Action Feed</span>
                {unreadCount > 0 && (
                  <span className="gh-feed-unread-badge">{unreadCount} new</span>
                )}
              </div>
              <div className="gh-feed-header-right">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="gh-feed-mark-all"
                    onClick={() => void markNotificationsRead("mark-all-read")}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  className="gh-feed-close"
                  onClick={() => setNotifOpen(false)}
                  aria-label="Close action feed"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="gh-feed-list">
              {notifications.length === 0 ? (
                <div className="gh-feed-empty">
                  <p>No activity yet.</p>
                  <p>Complete sessions and earn IP to see your coaching updates here.</p>
                </div>
              ) : (
                notifications.slice(0, 20).map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    onClick={() => {
                      if (!item.read) {
                        void markNotificationsRead("mark-read", item.id);
                      }
                      setNotifOpen(false);
                      if (item.ctaHref) router.push(item.ctaHref);
                    }}
                  />
                ))
              )}
            </div>
          </aside>
        </>
      )}

      {/* ── FOCUS MODAL ── */}
      {focusModal && (
        <FocusModal data={focusModal} onClose={() => setFocusModal(null)} />
      )}

      {levelUpModal && (
        <div className="gh-levelup-overlay" onClick={() => setLevelUpModal(null)}>
          <div className="gh-levelup-modal gh-levelup-modal--celebration" onClick={(event) => event.stopPropagation()}>
            <p className="gh-levelup-label">RANK ACHIEVED</p>
            <h3 className="gh-levelup-title">{levelUpModal.level}</h3>
            <p className="gh-levelup-sub">New perks unlocked, including executive-level interview scenarios.</p>
            <p className="gh-levelup-sub">IP Earned: +500 bonus IP for the promotion.</p>
            <button
              type="button"
              className="gh-levelup-btn"
              onClick={() => setLevelUpModal(null)}
            >
              View My New Career Roadmap
            </button>
          </div>
        </div>
      )}

      {eliteModalOpen && (
        <div className="gh-elite-overlay" onClick={() => {
          setEliteModalOpen(false);
          if (typeof window !== "undefined") {
            const pending = window.localStorage.getItem(MASTERY_EVENT_PENDING_KEY);
            if (pending) window.localStorage.setItem(MASTERY_EVENT_SEEN_KEY, pending);
          }
        }}>
          <div className="gh-elite-modal" onClick={(event) => event.stopPropagation()}>
            <p className="gh-elite-label">Elite Achievement</p>
            <h3 className="gh-elite-title">Mastery Protocol Complete</h3>
            <p className="gh-elite-sub">
              You are now Hirely Coach Alumni / Master. Legacy Mode is unlocked.
            </p>
            <button
              type="button"
              className="gh-elite-btn"
              onClick={() => {
                setEliteModalOpen(false);
                if (typeof window !== "undefined") {
                  const pending = window.localStorage.getItem(MASTERY_EVENT_PENDING_KEY);
                  if (pending) window.localStorage.setItem(MASTERY_EVENT_SEEN_KEY, pending);
                }
              }}
            >
              Enter Legacy Mode
            </button>
          </div>
        </div>
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
