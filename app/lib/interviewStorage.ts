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

const URL_RE = /https?:\/\/[^\s]+/i;

function looksLikeUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return v.includes("http") || v.includes("searchjobs") || URL_RE.test(v);
}

function extractSessionUrl(session: InterviewSession): string {
  const title = String(session.jobTitle || "").trim();
  if (URL_RE.test(title)) {
    return title.match(URL_RE)?.[0] || "";
  }

  const jobText = String(session.job || "");
  const url = jobText.match(URL_RE)?.[0] || "";
  return url;
}

export function loadInterviewHistory(userId?: string | null): InterviewSession[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(getHistoryKey(userId));
  return safeParse(raw);
}

export async function backfillLegacySessionTitles(userId?: string | null): Promise<number> {
  if (typeof window === "undefined") return 0;

  const history = loadInterviewHistory(userId);
  if (!history.length) return 0;

  const updated = [...history];
  let changed = 0;

  for (let i = 0; i < updated.length; i += 1) {
    const session = updated[i];
    const currentTitle = String(session.jobTitle || "").trim();
    if (currentTitle && !looksLikeUrl(currentTitle)) continue;

    const sourceUrl = extractSessionUrl(session);
    if (!sourceUrl) continue;

    try {
      const res = await fetch("/api/scrape-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl }),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as { title?: string; company?: string };
      const title = String(data.title || "").trim();
      const company = String(data.company || "").trim();
      const cleanTitle = company ? `${title} @ ${company}` : title;

      if (!cleanTitle || looksLikeUrl(cleanTitle)) continue;

      updated[i] = {
        ...session,
        jobTitle: cleanTitle,
      };
      changed += 1;
    } catch {
      // continue with next session
    }
  }

  if (changed > 0) {
    window.localStorage.setItem(getHistoryKey(userId), JSON.stringify(updated.slice(0, 20)));

    const snapshot = loadGrowthHubSnapshot(userId);
    if (snapshot) {
      const matched = updated.find((session) => session.id === snapshot.sessionId);
      const matchedTitle = String(matched?.jobTitle || "").trim();
      if (matchedTitle && !looksLikeUrl(matchedTitle)) {
        saveGrowthHubSnapshot(
          {
            ...snapshot,
            jobTitle: matchedTitle,
          },
          userId
        );
      }
    }
  }

  return changed;
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
