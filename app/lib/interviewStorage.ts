export type InterviewSession = {
  id: string;
  createdAt: number;
  resume: string;
  jobTitle?: string;
  job: string;
  questions: string[];
  answers: string[];
  feedback: string;
  level?: string;
  starrScore?: number;
  transcript?: TranscriptEntry[];
  analysis?: SessionAnalysis;
};

export type TranscriptEntry = {
  question: string;
  answer: string;
};

export type SessionAnalysis = {
  starrHighlights: Partial<Record<"Situation" | "Task" | "Action" | "Result" | "Reflection", string>>;
  strongPoints: string[];
  weakPoints: string[];
};

export type GrowthHubSnapshot = {
  sessionId: string;
  createdAt: number;
  starrScore: number;
  topWeakness: string;
  jobTitle: string;
};

export type GuestMigrationResult = {
  movedHistoryCount: number;
  latestSnapshot: GrowthHubSnapshot | null;
};

export type TrainingModuleId = "logic" | "storytelling" | "delivery";

export type TrainingProgress = {
  completedModules: TrainingModuleId[];
};

export const CORE_MODULE_IP: Record<TrainingModuleId, number> = {
  logic: 700,
  storytelling: 650,
  delivery: 650,
};

export const REQUIRED_CORE_IP = CORE_MODULE_IP.logic + CORE_MODULE_IP.storytelling + CORE_MODULE_IP.delivery;
export const IP_PER_LEVEL = 2000;

// Backward-compatible aliases
export const CORE_MODULE_XP = CORE_MODULE_IP;
export const REQUIRED_CORE_XP = REQUIRED_CORE_IP;
export const XP_PER_LEVEL = IP_PER_LEVEL;

const GUEST_STORAGE_KEY = "hirelyCoachInterviewHistory";
const GUEST_GROWTHHUB_KEY = "hirelyCoachGrowthHub";
const GUEST_PENDING_SESSION_KEY = "hirelyCoachPendingGuestSession";
const CLAIMED_GUEST_INTERVIEW_KEY = "hirelyClaimedGuestInterview.v1";

const getHistoryKey = (userId?: string | null) =>
  userId ? `hirelyCoachInterviewHistory:${userId}` : GUEST_STORAGE_KEY;

const getGrowthHubKey = (userId?: string | null) =>
  userId ? `hirelyCoachGrowthHub:${userId}` : GUEST_GROWTHHUB_KEY;

function safeParse(value: string | null) {
  if (!value) return [];
  try {
    return JSON.parse(value) as InterviewSession[];
  } catch {
    return [];
  }
}

export function loadInterviewHistory(userId?: string | null): InterviewSession[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(getHistoryKey(userId));
  return safeParse(raw);
}

export function findInterviewSession(sessionId: string, userId?: string | null) {
  return loadInterviewHistory(userId).find((session) => session.id === sessionId) ?? null;
}

export function saveInterviewSession(session: InterviewSession, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const current = loadInterviewHistory(userId);
    current.unshift(session);
    window.localStorage.setItem(getHistoryKey(userId), JSON.stringify(current.slice(0, 20)));
  } catch {
    // ignore localStorage failures
  }
}

export function clearInterviewHistory(userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getHistoryKey(userId));
}

/**
 * Backfills jobTitle on sessions that were saved before jobTitle was captured.
 * Derives a human-readable title from the first non-URL line of the job field.
 * Returns the number of sessions that were updated.
 */
export async function backfillLegacySessionTitles(
  userId?: string | null
): Promise<number> {
  if (typeof window === "undefined") return 0;
  const sessions = loadInterviewHistory(userId);
  let changed = 0;

  const filled = sessions.map((session) => {
    const existing = session.jobTitle?.trim();
    if (existing && !/^https?:\/\//i.test(existing)) return session;
    const firstLine = session.job.trim().split("\n")[0]?.trim().slice(0, 60) ?? "";
    const derived = firstLine && !/^https?:\/\//i.test(firstLine) ? firstLine : "Target Job";
    changed += 1;
    return { ...session, jobTitle: derived };
  });

  if (changed > 0) {
    try {
      window.localStorage.setItem(getHistoryKey(userId), JSON.stringify(filled));
    } catch {
      // ignore localStorage failures
    }
  }

  return changed;
}

export function saveGrowthHubSnapshot(snapshot: GrowthHubSnapshot, userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getGrowthHubKey(userId), JSON.stringify(snapshot));
  } catch {
    // ignore localStorage failures
  }
}

export function loadGrowthHubSnapshot(userId?: string | null): GrowthHubSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getGrowthHubKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as GrowthHubSnapshot;
  } catch {
    return null;
  }
}

export function migrateGuestDataToUser(userId: string): GuestMigrationResult {
  if (typeof window === "undefined") {
    return { movedHistoryCount: 0, latestSnapshot: null };
  }

  const guestHistory = loadInterviewHistory(null);
  const guestSnapshot = loadGrowthHubSnapshot(null);
  const pendingGuestRaw = window.sessionStorage.getItem(GUEST_PENDING_SESSION_KEY);
  let pendingGuestData: { session: InterviewSession; snapshot: GrowthHubSnapshot } | null = null;
  if (pendingGuestRaw) {
    try {
      pendingGuestData = JSON.parse(pendingGuestRaw) as {
        session: InterviewSession;
        snapshot: GrowthHubSnapshot;
      };
    } catch {
      pendingGuestData = null;
    }
  }

  if (pendingGuestData?.session) {
    try {
      window.localStorage.setItem(
        CLAIMED_GUEST_INTERVIEW_KEY,
        JSON.stringify({
          sessionId: pendingGuestData.session.id,
          createdAt: pendingGuestData.session.createdAt,
        })
      );
    } catch {
      // ignore storage failures
    }
  }

  if (pendingGuestData?.session) {
    guestHistory.unshift(pendingGuestData.session);
  }

  let latestSnapshot = guestSnapshot ?? pendingGuestData?.snapshot ?? null;

  if (guestHistory.length > 0) {
    const existing = loadInterviewHistory(userId);
    const merged = [...guestHistory, ...existing]
      .filter(
        (session, index, arr) => arr.findIndex((s) => s.id === session.id) === index
      )
      .slice(0, 20);
    window.localStorage.setItem(getHistoryKey(userId), JSON.stringify(merged));
  }

  if (guestSnapshot) {
    const existingSnapshot = loadGrowthHubSnapshot(userId);
    if (!existingSnapshot || guestSnapshot.createdAt > existingSnapshot.createdAt) {
      window.localStorage.setItem(getGrowthHubKey(userId), JSON.stringify(guestSnapshot));
      latestSnapshot = guestSnapshot;
    }
  }

  if (pendingGuestData?.snapshot) {
    const existingSnapshot = loadGrowthHubSnapshot(userId);
    if (!existingSnapshot || pendingGuestData.snapshot.createdAt > existingSnapshot.createdAt) {
      window.localStorage.setItem(getGrowthHubKey(userId), JSON.stringify(pendingGuestData.snapshot));
      latestSnapshot = pendingGuestData.snapshot;
    }
  }

  window.localStorage.removeItem(GUEST_STORAGE_KEY);
  window.localStorage.removeItem(GUEST_GROWTHHUB_KEY);
  window.sessionStorage.removeItem(GUEST_PENDING_SESSION_KEY);

  return {
    movedHistoryCount: guestHistory.length,
    latestSnapshot,
  };
}

export function savePendingGuestSession(session: InterviewSession, snapshot: GrowthHubSnapshot) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    GUEST_PENDING_SESSION_KEY,
    JSON.stringify({ session, snapshot })
  );
}

export function hasPendingGuestSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.sessionStorage.getItem(GUEST_PENDING_SESSION_KEY));
}

export function getClaimedGuestInterview(): { sessionId: string; createdAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLAIMED_GUEST_INTERVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sessionId?: string; createdAt?: number };
    if (!parsed.sessionId || !parsed.createdAt) return null;
    return { sessionId: parsed.sessionId, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function clearClaimedGuestInterview() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAIMED_GUEST_INTERVIEW_KEY);
}

// ─── Training progress ─────────────────────────────────────────────────────
const TRAINING_PROGRESS_KEY = "hirelyTrainingProgress";
const GUEST_TRAINING_KEY = "hirelyTrainingProgress_guest";

export function loadTrainingProgress(userId?: string | null): TrainingProgress {
  if (typeof window === "undefined") return { completedModules: [] };
  const key = userId ? `${TRAINING_PROGRESS_KEY}_${userId}` : GUEST_TRAINING_KEY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}") as Partial<TrainingProgress> | null;
    const completedModules = Array.isArray(parsed?.completedModules)
      ? parsed.completedModules.filter((m): m is TrainingModuleId => m === "logic" || m === "storytelling" || m === "delivery")
      : [];
    return { completedModules };
  } catch { return { completedModules: [] }; }
}

export function saveTrainingProgress(progress: TrainingProgress, userId?: string | null): void {
  if (typeof window === "undefined") return;
  const key = userId ? `${TRAINING_PROGRESS_KEY}_${userId}` : GUEST_TRAINING_KEY;
  window.localStorage.setItem(key, JSON.stringify(progress));
}

export function markTrainingModuleCompleted(userId: string | null | undefined, moduleId: TrainingModuleId): void {
  const progress = loadTrainingProgress(userId);
  if (!progress.completedModules.includes(moduleId)) {
    progress.completedModules.push(moduleId);
    saveTrainingProgress(progress, userId);
  }
}

export function hasCompletedAllTrainingModules(progress: TrainingProgress): boolean {
  const required: TrainingModuleId[] = ["logic", "storytelling", "delivery"];
  return required.every((moduleId) => progress.completedModules.includes(moduleId));
}
