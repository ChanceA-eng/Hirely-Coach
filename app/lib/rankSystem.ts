export type PrestigeRank = "APPRENTICE" | "PROFESSIONAL" | "MASTER";

export type RankThresholds = {
  professionalIp: number;
  masterIp: number;
  masterInterviewScore: number;
  masterResumeScore: number;
};

export type RankState = {
  totalIp: number;
  latestMockScore: number;
  globalResumeScore: number;
};

export type NextRankRequirement = {
  nextRank: PrestigeRank | null;
  pointsToNextRank: number;
  interviewGapToMaster: number;
  resumeGapToMaster: number;
};

export const DEFAULT_RANK_THRESHOLDS: RankThresholds = {
  professionalIp: 3000,
  masterIp: 10000,
  masterInterviewScore: 85,
  masterResumeScore: 90,
};

function toSafeInt(value: unknown): number {
  const n = Math.floor(Number(value || 0));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function normalizeRankState(input: Partial<RankState> | null | undefined): RankState {
  return {
    totalIp: toSafeInt(input?.totalIp),
    latestMockScore: toSafeInt(input?.latestMockScore),
    globalResumeScore: toSafeInt(input?.globalResumeScore),
  };
}

export function derivePrestigeRank(
  input: Partial<RankState> | null | undefined,
  thresholds: RankThresholds = DEFAULT_RANK_THRESHOLDS
): PrestigeRank {
  const state = normalizeRankState(input);

  const canBeMaster =
    state.totalIp >= thresholds.masterIp &&
    state.latestMockScore >= thresholds.masterInterviewScore &&
    state.globalResumeScore >= thresholds.masterResumeScore;

  if (canBeMaster) return "MASTER";
  if (state.totalIp >= thresholds.professionalIp) return "PROFESSIONAL";
  return "APPRENTICE";
}

export function getNextRankRequirement(
  input: Partial<RankState> | null | undefined,
  thresholds: RankThresholds = DEFAULT_RANK_THRESHOLDS
): NextRankRequirement {
  const state = normalizeRankState(input);
  const rank = derivePrestigeRank(state, thresholds);

  if (rank === "APPRENTICE") {
    return {
      nextRank: "PROFESSIONAL",
      pointsToNextRank: Math.max(0, thresholds.professionalIp - state.totalIp),
      interviewGapToMaster: Math.max(0, thresholds.masterInterviewScore - state.latestMockScore),
      resumeGapToMaster: Math.max(0, thresholds.masterResumeScore - state.globalResumeScore),
    };
  }

  if (rank === "PROFESSIONAL") {
    return {
      nextRank: "MASTER",
      pointsToNextRank: Math.max(0, thresholds.masterIp - state.totalIp),
      interviewGapToMaster: Math.max(0, thresholds.masterInterviewScore - state.latestMockScore),
      resumeGapToMaster: Math.max(0, thresholds.masterResumeScore - state.globalResumeScore),
    };
  }

  return {
    nextRank: null,
    pointsToNextRank: 0,
    interviewGapToMaster: 0,
    resumeGapToMaster: 0,
  };
}

export function didRankIncrease(previousRank: PrestigeRank, nextRank: PrestigeRank): boolean {
  const order: PrestigeRank[] = ["APPRENTICE", "PROFESSIONAL", "MASTER"];
  return order.indexOf(nextRank) > order.indexOf(previousRank);
}
