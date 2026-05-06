export type UserMode = "foundation" | "coach";

export type FoundationProgress = {
  completedLessons: string[];
  completedModules: number[];
  assessmentScores: Record<string, number>;
  graduatedAt?: string;
};

export type FoundationProfile = {
  onboardingComplete: boolean;
  totalXp: number;
  languagePref: "en" | "sw";
};

export type FoundationOverride = {
  unlockedModules: number[];
};

const MODE_KEY = "hirely.mode";
const PROGRESS_KEY = "hirely.foundation.progress";
const PROFILE_KEY = "hirely.foundation.profile";
const OVERRIDE_KEY = "hirely.foundation.override";
const PENDING_XP_KEY = "hirely.foundation.pending-xp";
const FOUNDATION_IP_BONUS = 150; // Bonus IP awarded on graduation
const PASS_THRESHOLD = 80; // Minimum score to pass an assessment
export const TOTAL_MODULES = 12;
export const TOTAL_MODULE_SEQUENCE = [1, 2, 3, 4, 5, 6] as const;
export const TOTAL_FOUNDATION_LESSONS = 80;
export const FOUNDATION_XP_TYPING = 50;
export const FOUNDATION_XP_VOICE = 100;
export const FOUNDATION_XP_MODULE = 500;
export const FOUNDATION_PROGRESS_EVENT = "hirely.foundation.progress-changed";
export const FOUNDATION_PROFILE_EVENT = "hirely.foundation.profile-changed";
export const FOUNDATION_INBOX_EVENT = "hirely.foundation.inbox-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

function emitFoundationEvent(name: string) {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(name));
}

export function getMode(): UserMode | null {
  if (!isBrowser()) return null;
  return (localStorage.getItem(MODE_KEY) as UserMode) ?? null;
}

export function setMode(mode: UserMode) {
  if (!isBrowser()) return;
  localStorage.setItem(MODE_KEY, mode);
}

export function getFoundationProgress(): FoundationProgress {
  if (!isBrowser()) return emptyProgress();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    return JSON.parse(raw) as FoundationProgress;
  } catch {
    return emptyProgress();
  }
}

export function getFoundationProfile(): FoundationProfile {
  if (!isBrowser()) return { onboardingComplete: false, totalXp: 0, languagePref: "en" };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { onboardingComplete: false, totalXp: 0, languagePref: "en" };
    const parsed = JSON.parse(raw) as Partial<FoundationProfile>;
    return {
      onboardingComplete: Boolean(parsed.onboardingComplete),
      totalXp: Math.max(0, Math.floor(Number(parsed.totalXp ?? 0) || 0)),
      languagePref: parsed.languagePref === "sw" ? "sw" : "en",
    };
  } catch {
    return { onboardingComplete: false, totalXp: 0, languagePref: "en" };
  }
}

export function getFoundationOverride(): FoundationOverride {
  if (!isBrowser()) return { unlockedModules: [] };
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return { unlockedModules: [] };
    const parsed = JSON.parse(raw) as Partial<FoundationOverride>;
    return {
      unlockedModules: Array.isArray(parsed.unlockedModules)
        ? parsed.unlockedModules
            .map(Number)
            .filter((moduleNum) => Number.isFinite(moduleNum) && moduleNum >= 1 && moduleNum <= 12)
        : [],
    };
  } catch {
    return { unlockedModules: [] };
  }
}

function emptyProgress(): FoundationProgress {
  return { completedLessons: [], completedModules: [], assessmentScores: {} };
}

function saveProgress(p: FoundationProgress) {
  if (!isBrowser()) return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  emitFoundationEvent(FOUNDATION_PROGRESS_EVENT);
}

function saveFoundationProfile(profile: FoundationProfile) {
  if (!isBrowser()) return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  emitFoundationEvent(FOUNDATION_PROFILE_EVENT);
}

function saveFoundationOverride(override: FoundationOverride) {
  if (!isBrowser()) return;
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(override));
  emitFoundationEvent(FOUNDATION_PROGRESS_EVENT);
}

export function hydrateFoundationState(payload: {
  mode?: UserMode | null;
  progress?: FoundationProgress;
  profile?: { onboarding_complete?: boolean; total_xp?: number; language_pref?: "en" | "sw" } | FoundationProfile;
  override?: { unlocked_modules?: number[] } | FoundationOverride;
}) {
  if (!isBrowser()) return;

  if (payload.mode === "foundation" || payload.mode === "coach") {
    setMode(payload.mode);
  }

  if (payload.progress) {
    saveProgress(payload.progress);
  }

  if (payload.profile) {
    const profile: FoundationProfile = "onboardingComplete" in payload.profile
      ? payload.profile
      : {
          onboardingComplete: Boolean(payload.profile.onboarding_complete),
          totalXp: Math.max(0, Math.floor(Number(payload.profile.total_xp ?? 0) || 0)),
          languagePref: payload.profile.language_pref === "sw" ? "sw" : "en",
        };
    saveFoundationProfile(profile);
  }

  if (payload.override) {
    const override: FoundationOverride = "unlockedModules" in payload.override
      ? payload.override
      : {
          unlockedModules: Array.isArray(payload.override.unlocked_modules)
            ? payload.override.unlocked_modules
                .map(Number)
                .filter((moduleNum) => Number.isFinite(moduleNum) && moduleNum >= 1 && moduleNum <= 12)
            : [],
        };
    saveFoundationOverride(override);
  }
}

export function getFoundationLanguagePref(): "en" | "sw" {
  return getFoundationProfile().languagePref;
}

export function setFoundationLanguagePref(languagePref: "en" | "sw") {
  const next = { ...getFoundationProfile(), languagePref };
  saveFoundationProfile(next);
  syncFoundationProfileToCloud(next).catch(() => {});
}

export function setFoundationOnboardingComplete(completed: boolean) {
  const next = { ...getFoundationProfile(), onboardingComplete: completed };
  saveFoundationProfile(next);
  syncFoundationProfileToCloud(next).catch(() => {});
}

export function consumePendingFoundationXpReward(): number {
  if (!isBrowser()) return 0;
  const next = Math.max(0, Math.floor(Number(localStorage.getItem(PENDING_XP_KEY) ?? 0) || 0));
  localStorage.removeItem(PENDING_XP_KEY);
  return next;
}

export function notifyFoundationInboxChanged() {
  emitFoundationEvent(FOUNDATION_INBOX_EVENT);
}

export function awardFoundationXp(amount: number): number {
  if (!amount || amount < 0) return getFoundationProfile().totalXp;
  const next = { ...getFoundationProfile(), totalXp: getFoundationProfile().totalXp + amount };
  saveFoundationProfile(next);
  if (isBrowser()) localStorage.setItem(PENDING_XP_KEY, String(amount));
  syncFoundationProfileToCloud(next).catch(() => {});
  return next.totalXp;
}

export function rewardLessonMastery(lessonType: string): number | null {
  if (lessonType === "fill_blank") return awardFoundationXp(FOUNDATION_XP_TYPING);
  if (lessonType === "speaking_prompt" || lessonType === "ai_conversation") {
    return awardFoundationXp(FOUNDATION_XP_VOICE);
  }
  return null;
}

export function completeLesson(lessonId: string) {
  const progress = getFoundationProgress();
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
    saveProgress(progress);
    // Persist to cloud async (fire-and-forget)
    syncProgressToCloud(progress).catch(() => {});
  }
}

export function saveAssessmentScore(moduleNum: number, score: number) {
  const progress = getFoundationProgress();
  const key = `module-${moduleNum}`;
  const wasComplete = progress.completedModules.includes(moduleNum);
  progress.assessmentScores[key] = score;
  if (score >= PASS_THRESHOLD && !progress.completedModules.includes(moduleNum)) {
    progress.completedModules.push(moduleNum);
  }
  saveProgress(progress);
  syncProgressToCloud(progress).catch(() => {});

  if (score >= PASS_THRESHOLD && !wasComplete) {
    awardFoundationXp(FOUNDATION_XP_MODULE);
    const nextModule = moduleNum + 1;
    if (nextModule <= TOTAL_MODULES) {
      fetch("/api/user/foundation-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "module-unlock", moduleNum: nextModule }),
      })
        .then(() => notifyFoundationInboxChanged())
        .catch(() => {});
    }
  }
}

export function isModuleUnlocked(moduleNum: number): boolean {
  const override = getFoundationOverride();
  if (override.unlockedModules.includes(moduleNum)) return true;
  if (moduleNum === 1) return true;
  const progress = getFoundationProgress();
  return progress.completedModules.includes(moduleNum - 1);
}

export function isModuleComplete(moduleNum: number): boolean {
  const progress = getFoundationProgress();
  return progress.completedModules.includes(moduleNum);
}

export function isAllModulesComplete(): boolean {
  const progress = getFoundationProgress();
  return TOTAL_MODULE_SEQUENCE.every((m) => progress.completedModules.includes(m));
}

export function getModuleScore(moduleNum: number): number | null {
  const progress = getFoundationProgress();
  const score = progress.assessmentScores[`module-${moduleNum}`];
  return score !== undefined ? score : null;
}

export function getLessonProgress(moduleNum: number, totalLessons: number): number {
  const progress = getFoundationProgress();
  const prefix = `${moduleNum}-`;
  const done = progress.completedLessons.filter((id) => id.startsWith(prefix)).length;
  return Math.round((done / totalLessons) * 100);
}

export async function syncProgressToCloud(progress?: FoundationProgress) {
  const p = progress ?? getFoundationProgress();
  await fetch("/api/user/mode", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foundation_progress: p }),
  });
}

export async function syncFoundationProfileToCloud(profile?: FoundationProfile) {
  const p = profile ?? getFoundationProfile();
  await fetch("/api/user/mode", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      foundation_profile: {
        onboarding_complete: p.onboardingComplete,
        total_xp: p.totalXp,
        language_pref: p.languagePref,
      },
    }),
  });
}

/**
 * handleGraduation — triggers when all Foundation assessments are passed.
 * Updates mode to "coach", marks graduated, awards bonus IP, notifies admin.
 */
export async function handleGraduation() {
  if (!isBrowser()) return;

  // 1. Update cloud mode + progress
  const progress = getFoundationProgress();
  progress.graduatedAt = new Date().toISOString();
  saveProgress(progress);
  setMode("coach");

  await fetch("/api/user/mode", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_mode: "coach",
      foundation_progress: progress,
    }),
  });

  // 2. Award Foundation Graduate bonus IP
  try {
    const current = parseInt(localStorage.getItem("hirelyImpactPoints") ?? "0", 10);
    localStorage.setItem("hirelyImpactPoints", String(current + FOUNDATION_IP_BONUS));
  } catch {
    // non-critical
  }

  // 3. Log graduation event for admin audit
  try {
    await fetch("/api/admin/user-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "foundation_graduation",
        timestamp: new Date().toISOString(),
        ipBonus: FOUNDATION_IP_BONUS,
      }),
    });
  } catch {
    // non-critical
  }
}

export { FOUNDATION_IP_BONUS, PASS_THRESHOLD };
