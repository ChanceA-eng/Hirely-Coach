export type ProgressTier = {
  title: "Novice" | "Apprentice" | "Candidate" | "Professional" | "Expert" | "Executive" | "Advanced" | "Master";
  minIp: number;
};

export type StreakState = {
  streakDays: number;
  lastActiveDay: string;
};

export type InterviewAdminOverride = {
  masterUnlock?: boolean;
  forcedTier?: number | null;
  forcedCourseLevel?: number | null;
  promotionSupportUnlock?: boolean;
  updatedAt?: number;
};

/** Hard gate that must be satisfied alongside the IP threshold to earn a gated title. */
export type HardGate = {
  requirement: string;
  promotionMessage: string;
};

export const HARD_GATES: Partial<Record<ProgressTier["title"], HardGate>> = {
  Novice: {
    requirement: 'Complete "STAR Method 101"',
    promotionMessage: 'Promotion Pending: Complete "STAR Method 101" to validate Novice level.',
  },
  Apprentice: {
    requirement: "Log 3 Wins in the Impact Ledger",
    promotionMessage: "Promotion Pending: Log 3 Impact Ledger wins for Apprentice.",
  },
  Candidate: {
    requirement: "Score 80+ on a Behavioral Simulation",
    promotionMessage: "Promotion Pending: Reach 80+ on a Behavioral Simulation for Candidate.",
  },
  Expert: {
    requirement: "Log 1 Process Improvement win verified by HC",
    promotionMessage: "Promotion Pending: Add one HC-verified Process Improvement win for Expert.",
  },
  Executive: {
    requirement: 'Complete "Leadership and Influence Basics" course',
    promotionMessage: 'Promotion Pending: Complete "Leadership and Influence Basics" for Executive.',
  },
  Advanced: {
    requirement: "Achieve 90+ on a Salary Negotiation Simulation",
    promotionMessage: "Promotion Pending: Reach 90+ on a Salary Negotiation Simulation for Advanced.",
  },
  Master: {
    requirement: "Export one Performance Portfolio",
    promotionMessage: "Promotion Pending: Export one Performance Portfolio to unlock Master.",
  },
};

const IP_KEY = "hirelyImpactPoints";
const LEGACY_XP_KEY = "hirelyCoachXP";
const STREAK_KEY = "hirelyProgressStreak";
const RESUME_HASH_REWARD_KEY = "hirelyReward.resumeHash.v2";
const SUGGESTION_REWARD_KEY = "hirelyReward.suggestion.v1";
const PORTFOLIO_EXPORT_REWARD_KEY = "hirelyReward.portfolioExport.v1";
const IMPACT_LOG_DAILY_KEY_PREFIX = "hirelyReward.impactLog.daily.";
const IMPACT_LOG_WEEKLY_KEY_PREFIX = "hirelyReward.impactLog.week.";
const BASELINE_RESUME_SCORE_KEY = "hirely.resumeBaseline.v1";
const IP_REBALANCE_KEY = "hirely.ipRebalance.v1";
// Shared key with upload/page.tsx high-score tracker
const HIGHEST_RESUME_SCORE_KEY = "hirely.optimizer.highscore.v1";

export const LEVELS: ProgressTier[] = [
  { title: "Novice", minIp: 0 },
  { title: "Apprentice", minIp: 250 },
  { title: "Candidate", minIp: 750 },
  { title: "Professional", minIp: 1250 },
  { title: "Expert", minIp: 1500 },
  { title: "Executive", minIp: 3000 },
  { title: "Advanced", minIp: 5000 },
  { title: "Master", minIp: 10000 },
];

export const PROMOTION_SUPPORT_MIN_TIER: ProgressTier["title"] = "Executive";

function isBrowser() {
  return typeof window !== "undefined";
}

function parseStoredSet(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((item) => String(item || "").trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function saveStoredSet(key: string, set: Set<string>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify([...set].slice(0, 300)));
}

function dayStamp(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function loadIP(): number {
  if (!isBrowser()) return 0;

  // One-time rebalance so legacy inflated totals from older game rewards do not
  // immediately place users into high ranks without the new gate requirements.
  const hasRebalanced = window.localStorage.getItem(IP_REBALANCE_KEY) === "1";
  const current = Number(window.localStorage.getItem(IP_KEY) || "0");
  if (Number.isFinite(current) && current > 0) {
    const safeCurrent = Math.floor(current);
    if (!hasRebalanced) {
      const rebalanced = Math.min(safeCurrent, 240);
      window.localStorage.setItem(IP_KEY, String(rebalanced));
      window.localStorage.setItem(LEGACY_XP_KEY, String(rebalanced));
      window.localStorage.setItem(IP_REBALANCE_KEY, "1");
      return rebalanced;
    }
    return safeCurrent;
  }

  const legacy = Number(window.localStorage.getItem(LEGACY_XP_KEY) || "0");
  if (Number.isFinite(legacy) && legacy > 0) {
    const migrated = Math.min(Math.floor(legacy), 240);
    window.localStorage.setItem(IP_KEY, String(migrated));
    window.localStorage.setItem(LEGACY_XP_KEY, String(migrated));
    window.localStorage.setItem(IP_REBALANCE_KEY, "1");
    return migrated;
  }

  if (!hasRebalanced) {
    window.localStorage.setItem(IP_REBALANCE_KEY, "1");
  }

  return 0;
}

export function saveIP(ip: number): number {
  const safe = Math.max(0, Math.floor(Number(ip) || 0));
  if (isBrowser()) {
    window.localStorage.setItem(IP_KEY, String(safe));
    // Keep legacy key in sync to avoid regressions in untouched areas.
    window.localStorage.setItem(LEGACY_XP_KEY, String(safe));
  }
  return safe;
}

export function addIP(delta: number): number {
  const current = loadIP();
  return saveIP(current + Math.max(0, Math.floor(delta)));
}

export function getTierByIP(ip: number): ProgressTier {
  const safeIp = Math.max(0, Math.floor(ip));
  let tier = LEVELS[0];
  for (const level of LEVELS) {
    if (safeIp >= level.minIp) tier = level;
  }
  return tier;
}

function clampTierOrdinal(value: unknown): number | null {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > LEVELS.length) {
    return null;
  }
  return numeric;
}

function getTierOrdinal(title: ProgressTier["title"]): number {
  return LEVELS.findIndex((level) => level.title === title) + 1;
}

export function getInterviewAdminOverride(input: unknown): InterviewAdminOverride {
  const row = (input ?? {}) as Record<string, unknown>;
  const source = typeof row.interviewAdminOverride === "object" && row.interviewAdminOverride
    ? (row.interviewAdminOverride as Record<string, unknown>)
    : row;

  return {
    masterUnlock: Boolean(source.masterUnlock),
    forcedTier: clampTierOrdinal(source.forcedTier),
    forcedCourseLevel: clampTierOrdinal(source.forcedCourseLevel),
    promotionSupportUnlock: Boolean(source.promotionSupportUnlock),
    updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : undefined,
  };
}

export function getEffectiveTierByIP(ip: number, metadata?: unknown): ProgressTier {
  const override = getInterviewAdminOverride(metadata);
  if (override.forcedTier) {
    return LEVELS[override.forcedTier - 1];
  }
  return getTierByIP(ip);
}

export function canAccessPromotionSupport(ip: number, metadata?: unknown): boolean {
  const override = getInterviewAdminOverride(metadata);
  if (override.promotionSupportUnlock) {
    return true;
  }
  return getTierOrdinal(getEffectiveTierByIP(ip, metadata).title) >= getTierOrdinal(PROMOTION_SUPPORT_MIN_TIER);
}

export function getPromotionSupportAccess(ip: number, metadata?: unknown) {
  const override = getInterviewAdminOverride(metadata);
  const unlocked = canAccessPromotionSupport(ip, metadata);

  return {
    unlocked,
    requiredTier: PROMOTION_SUPPORT_MIN_TIER,
    detail: unlocked
      ? override.promotionSupportUnlock
        ? "Unlocked by admin override."
        : `Unlocked at ${PROMOTION_SUPPORT_MIN_TIER} tier.`
      : `Promotion Support unlocks at ${PROMOTION_SUPPORT_MIN_TIER} tier. Reach 3,000 IP to open the Performance Portfolio tools.`,
  };
}

export function getProgressMeta(ip: number) {
  const safeIp = Math.max(0, Math.floor(ip));
  const tier = getTierByIP(safeIp);
  const tierIndex = LEVELS.findIndex((level) => level.title === tier.title);
  const nextTier = tierIndex >= LEVELS.length - 1 ? null : LEVELS[tierIndex + 1];

  if (!nextTier) {
    return {
      tier,
      nextTier: null,
      progressPct: 100,
      remainingToNext: 0,
    };
  }

  const span = nextTier.minIp - tier.minIp;
  const covered = safeIp - tier.minIp;
  const progressPct = Math.max(0, Math.min(100, Math.round((covered / span) * 100)));

  return {
    tier,
    nextTier,
    progressPct,
    remainingToNext: Math.max(0, nextTier.minIp - safeIp),
  };
}

export function isCandidateUnlocked(ip: number): boolean {
  return ip >= 750;
}

export function isApprenticeUnlocked(ip: number): boolean {
  return ip >= 250;
}

export function isExecutiveUnlocked(ip: number): boolean {
  return ip >= 3000;
}

// ─── Gate checkers (UI passes in the required counts) ────────────────────────

export function checkNoviceGate(hasCompletedStar101: boolean): { met: boolean; detail: string } {
  return {
    met: hasCompletedStar101,
    detail: hasCompletedStar101 ? "STAR Method 101 completed" : "STAR Method 101 not completed",
  };
}

export function checkApprenticeGate(loggedWins: number): { met: boolean; detail: string } {
  return {
    met: loggedWins >= 3,
    detail: `${loggedWins}/3 Impact Ledger wins logged`,
  };
}

export function checkCandidateGate(bestBehavioralSimulationScore: number): { met: boolean; detail: string } {
  return {
    met: bestBehavioralSimulationScore >= 80,
    detail: `Behavioral Simulation score ${bestBehavioralSimulationScore}/80+`,
  };
}

export function checkExpertGate(processImprovementWinsVerified: number): { met: boolean; detail: string } {
  return {
    met: processImprovementWinsVerified >= 1,
    detail: `${processImprovementWinsVerified}/1 HC-verified Process Improvement wins`,
  };
}

export function checkExecutiveGate(leadershipCourseCompleted: boolean): { met: boolean; detail: string } {
  return {
    met: leadershipCourseCompleted,
    detail: leadershipCourseCompleted
      ? "Leadership and Influence course completed"
      : "Leadership and Influence course not completed",
  };
}

export function checkAdvancedGate(salaryNegotiationScore: number): { met: boolean; detail: string } {
  return {
    met: salaryNegotiationScore >= 90,
    detail: `Salary Negotiation Simulation score ${salaryNegotiationScore}/90+`,
  };
}

export function checkMasterGate(hasExportedPortfolio: boolean): { met: boolean; detail: string } {
  return {
    met: hasExportedPortfolio,
    detail: hasExportedPortfolio
      ? "Performance Portfolio exported"
      : "Performance Portfolio not exported",
  };
}

export function hasExportedPerformancePortfolio(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(PORTFOLIO_EXPORT_REWARD_KEY) === "1";
}

// ─── Baseline / highest score persistence ────────────────────────────────────

export function loadBaselineResumeScore(): number | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(BASELINE_RESUME_SCORE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Saves the baseline only on first call (first-ever resume scan score). */
export function saveBaselineResumeScore(score: number): void {
  if (!isBrowser()) return;
  if (loadBaselineResumeScore() !== null) return; // baseline is immutable once set
  const safe = Math.max(0, Math.floor(Number(score) || 0));
  if (safe > 0) window.localStorage.setItem(BASELINE_RESUME_SCORE_KEY, String(safe));
}

export function loadHighestResumeScore(): number {
  if (!isBrowser()) return 0;
  const n = Number(window.localStorage.getItem(HIGHEST_RESUME_SCORE_KEY) || "0");
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

// ─── Anti-spam helpers ────────────────────────────────────────────────────────

function weekStamp(date: Date): string {
  // ISO week — use simple year+week-of-year
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function impactLogDailyCount(day: string): number {
  if (!isBrowser()) return 0;
  return Number(window.localStorage.getItem(`${IMPACT_LOG_DAILY_KEY_PREFIX}${day}`) || "0");
}

function impactLogWeekCount(week: string): number {
  if (!isBrowser()) return 0;
  return Number(window.localStorage.getItem(`${IMPACT_LOG_WEEKLY_KEY_PREFIX}${week}`) || "0");
}

function incrementImpactLogCounters(day: string, week: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    `${IMPACT_LOG_DAILY_KEY_PREFIX}${day}`,
    String(impactLogDailyCount(day) + 1)
  );
  window.localStorage.setItem(
    `${IMPACT_LOG_WEEKLY_KEY_PREFIX}${week}`,
    String(impactLogWeekCount(week) + 1)
  );
}

// ─── IP award functions ───────────────────────────────────────────────────────

/**
 * Awards +5 IP for a new impact log entry.
 * Anti-spam: max 1 award per day, max 3 per week.
 */
export function awardImpactLedgerEntry(
  entryId: string,
  now: Date = new Date()
): { awarded: boolean; ip: number; reason?: string } {
  if (!isBrowser()) return { awarded: false, ip: 0 };

  // Per-entry dedup (unchanged)
  const token = `impact:${entryId}`;
  const rewarded = parseStoredSet(SUGGESTION_REWARD_KEY);
  if (rewarded.has(token)) return { awarded: false, ip: loadIP() };

  const today = dayStamp(now);
  const week = weekStamp(now);

  if (impactLogDailyCount(today) >= 1) {
    return { awarded: false, ip: loadIP(), reason: "Daily limit reached (1 IP award per day)" };
  }
  if (impactLogWeekCount(week) >= 3) {
    return { awarded: false, ip: loadIP(), reason: "Weekly limit reached (3 IP awards per week)" };
  }

  rewarded.add(token);
  saveStoredSet(SUGGESTION_REWARD_KEY, rewarded);
  incrementImpactLogCounters(today, week);
  return { awarded: true, ip: addIP(5) };
}

/**
 * Awards +10 IP for scanning a meaningfully changed resume file.
 * Anti-cheat: the file hash must differ AND text length must change by >10%.
 */
export function awardResumeScanForUniqueFile(
  fileHash: string,
  textLength: number
): { awarded: boolean; ip: number; reason?: string } {
  if (!isBrowser()) return { awarded: false, ip: 0 };
  const hash = String(fileHash || "").trim();
  if (!hash) return { awarded: false, ip: loadIP() };

  type PrevScan = { hash: string; textLength: number };
  const prevRaw = window.localStorage.getItem(RESUME_HASH_REWARD_KEY);
  const prev: PrevScan | null = prevRaw
    ? (() => {
        try {
          return JSON.parse(prevRaw) as PrevScan;
        } catch {
          return null;
        }
      })()
    : null;

  if (prev?.hash === hash) {
    return { awarded: false, ip: loadIP(), reason: "Same file — no change detected" };
  }

  if (prev && prev.textLength > 0) {
    const changePct =
      Math.abs(textLength - prev.textLength) / Math.max(textLength, prev.textLength);
    if (changePct < 0.1) {
      // Update the stored hash so we don't keep rejecting future bigger changes from this version
      window.localStorage.setItem(
        RESUME_HASH_REWARD_KEY,
        JSON.stringify({ hash, textLength })
      );
      return {
        awarded: false,
        ip: loadIP(),
        reason: "Content changed by less than 10% — no IP awarded",
      };
    }
  }

  window.localStorage.setItem(
    RESUME_HASH_REWARD_KEY,
    JSON.stringify({ hash, textLength })
  );
  return { awarded: true, ip: addIP(10) };
}

export function awardSuggestionAccepted(uniqueSuggestionToken: string): { awarded: boolean; ip: number } {
  if (!isBrowser()) return { awarded: false, ip: 0 };
  const token = `suggestion:${String(uniqueSuggestionToken || "").trim()}`;
  if (!token || token === "suggestion:") return { awarded: false, ip: loadIP() };

  const rewarded = parseStoredSet(SUGGESTION_REWARD_KEY);
  if (rewarded.has(token)) return { awarded: false, ip: loadIP() };

  rewarded.add(token);
  saveStoredSet(SUGGESTION_REWARD_KEY, rewarded);
  return { awarded: true, ip: addIP(10) };
}

export function awardFirstPortfolioExport(): { awarded: boolean; ip: number } {
  if (!isBrowser()) return { awarded: false, ip: 0 };
  const alreadyAwarded = window.localStorage.getItem(PORTFOLIO_EXPORT_REWARD_KEY) === "1";
  if (alreadyAwarded) return { awarded: false, ip: loadIP() };

  window.localStorage.setItem(PORTFOLIO_EXPORT_REWARD_KEY, "1");
  return { awarded: true, ip: addIP(25) };
}

export function loadStreakState(): StreakState {
  if (!isBrowser()) return { streakDays: 0, lastActiveDay: "" };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STREAK_KEY) || "{}") as Partial<StreakState>;
    return {
      streakDays: Math.max(0, Number(parsed.streakDays || 0)),
      lastActiveDay: String(parsed.lastActiveDay || ""),
    };
  } catch {
    return { streakDays: 0, lastActiveDay: "" };
  }
}

export function applyDailyStreakBonus(now: Date = new Date()): {
  streak: StreakState;
  awarded: number;
  ip: number;
} {
  if (!isBrowser()) return { streak: { streakDays: 0, lastActiveDay: "" }, awarded: 0, ip: 0 };

  const today = dayStamp(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayStamp(yesterdayDate);

  const current = loadStreakState();
  if (current.lastActiveDay === today) {
    return { streak: current, awarded: 0, ip: loadIP() };
  }

  let streakDays = 1;
  let awarded = 0;

  if (current.lastActiveDay === yesterday) {
    streakDays = Math.max(1, current.streakDays + 1);
    awarded = 2;
  }

  const next = { streakDays, lastActiveDay: today };
  window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  const nextIp = awarded > 0 ? addIP(awarded) : loadIP();

  return { streak: next, awarded, ip: nextIp };
}
