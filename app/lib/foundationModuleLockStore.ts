/**
 * In-memory Foundation module lock store.
 * Controls which modules are unlocked for users and under what conditions.
 */

export type ModuleGroup = "foundation" | "intermediate" | "career_pro";

export type ModuleLockEntry = {
  moduleNum: number;
  title: string;
  group: ModuleGroup;
  status: "public" | "gated" | "locked";
  condition: string;
  videoUrl: string | null;
  videoStatus: "attached" | "none";
  sttThreshold: number; // 0-100 speech-to-text confidence threshold
  passingScore: number; // 0-100 required score to unlock next
};

const DEFAULT_ENTRIES: ModuleLockEntry[] = [
  { moduleNum: 1,  title: "Phonics Foundation",          group: "foundation",    status: "public", condition: "Always Unlocked",          videoUrl: null, videoStatus: "none", sttThreshold: 70, passingScore: 70 },
  { moduleNum: 2,  title: "Numbers & Colors",            group: "foundation",    status: "public", condition: "Always Unlocked",          videoUrl: null, videoStatus: "none", sttThreshold: 70, passingScore: 70 },
  { moduleNum: 3,  title: "Sound Lab",                   group: "foundation",    status: "public", condition: "Always Unlocked",          videoUrl: null, videoStatus: "none", sttThreshold: 70, passingScore: 70 },
  { moduleNum: 4,  title: "Pronouns & Verbs",            group: "foundation",    status: "public", condition: "Always Unlocked",          videoUrl: null, videoStatus: "none", sttThreshold: 70, passingScore: 70 },
  { moduleNum: 5,  title: "Food & Shopping",             group: "foundation",    status: "public", condition: "Always Unlocked",          videoUrl: null, videoStatus: "none", sttThreshold: 70, passingScore: 70 },
  { moduleNum: 6,  title: "Professional Vocabulary",     group: "foundation",    status: "public", condition: "Always Unlocked",          videoUrl: null, videoStatus: "none", sttThreshold: 70, passingScore: 70 },
  { moduleNum: 7,  title: "Conversation Confidence",     group: "intermediate",  status: "gated",  condition: "Complete Modules 1–6",     videoUrl: null, videoStatus: "none", sttThreshold: 75, passingScore: 75 },
  { moduleNum: 8,  title: "Weather & Feelings",          group: "intermediate",  status: "gated",  condition: "Complete Modules 1–6",     videoUrl: null, videoStatus: "none", sttThreshold: 75, passingScore: 75 },
  { moduleNum: 9,  title: "Directions & Community",      group: "intermediate",  status: "gated",  condition: "Complete Modules 1–6",     videoUrl: null, videoStatus: "none", sttThreshold: 75, passingScore: 75 },
  { moduleNum: 10, title: "Introducing Yourself",        group: "intermediate",  status: "gated",  condition: "Complete Modules 1–6",     videoUrl: null, videoStatus: "none", sttThreshold: 75, passingScore: 75 },
  { moduleNum: 11, title: "Interview Essentials",        group: "intermediate",  status: "gated",  condition: "Complete Modules 1–6",     videoUrl: null, videoStatus: "none", sttThreshold: 75, passingScore: 75 },
  { moduleNum: 12, title: "Exit Exam — First Day",       group: "career_pro",    status: "gated",  condition: "Score > 85% on Module 11", videoUrl: null, videoStatus: "none", sttThreshold: 80, passingScore: 85 },
];

const g = globalThis as typeof globalThis & {
  __foundationModuleLocks?: ModuleLockEntry[];
};
if (!g.__foundationModuleLocks) g.__foundationModuleLocks = structuredClone(DEFAULT_ENTRIES);

export function getModuleLocks(): ModuleLockEntry[] {
  return g.__foundationModuleLocks!;
}

export function updateModuleLock(moduleNum: number, patch: Partial<ModuleLockEntry>) {
  const locks = g.__foundationModuleLocks!;
  const idx = locks.findIndex((l) => l.moduleNum === moduleNum);
  if (idx === -1) return false;
  locks[idx] = { ...locks[idx], ...patch };
  return true;
}

export function resetModuleLocks() {
  g.__foundationModuleLocks = structuredClone(DEFAULT_ENTRIES);
}
