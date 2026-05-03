import { clerkClient } from "@clerk/nextjs/server";
import {
  DEFAULT_RANK_THRESHOLDS,
  derivePrestigeRank,
  didRankIncrease,
  getNextRankRequirement,
  normalizeRankState,
  type PrestigeRank,
  type RankState,
} from "@/app/lib/rankSystem";

export type RankUpgradeResult = {
  previousRank: PrestigeRank;
  nextRank: PrestigeRank;
  rankUp: boolean;
  pointsToNextRank: number;
  totalIp: number;
  latestMockScore: number;
  globalResumeScore: number;
  masterEvaluationOpen: boolean;
  interviewGapToMaster: number;
  resumeGapToMaster: number;
};

function toSafeInt(value: unknown): number {
  const n = Math.floor(Number(value || 0));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function normalizeProgressionState(input: unknown): {
  currentRank: PrestigeRank;
  totalIp: number;
  latestMockScore: number;
} {
  const row = (input ?? {}) as Record<string, unknown>;
  const currentRank =
    row.currentRank === "MASTER" || row.currentRank === "PROFESSIONAL" || row.currentRank === "APPRENTICE"
      ? row.currentRank
      : "APPRENTICE";

  return {
    currentRank,
    totalIp: toSafeInt(row.totalIp),
    latestMockScore: toSafeInt(row.latestMockScore),
  };
}

export async function checkRankUpgrade(
  userId: string,
  overrides?: Partial<RankState> & { previousRank?: PrestigeRank }
): Promise<RankUpgradeResult> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

  const progressionState = normalizeProgressionState(publicMetadata.progressionState);
  const resumeAudit = (publicMetadata.resumeAuditState ?? {}) as Record<string, unknown>;

  const totalIp = overrides?.totalIp ?? progressionState.totalIp;
  const latestMockScore = overrides?.latestMockScore ?? progressionState.latestMockScore;
  const globalResumeScore = overrides?.globalResumeScore ?? toSafeInt(resumeAudit.overallScore);
  const previousRank = overrides?.previousRank ?? progressionState.currentRank;

  const normalized = normalizeRankState({
    totalIp,
    latestMockScore,
    globalResumeScore,
  });

  const nextRank = derivePrestigeRank(normalized, DEFAULT_RANK_THRESHOLDS);
  const nextReq = getNextRankRequirement(normalized, DEFAULT_RANK_THRESHOLDS);
  const rankUp = didRankIncrease(previousRank, nextRank);

  const masterEvaluationOpen =
    normalized.totalIp >= DEFAULT_RANK_THRESHOLDS.masterIp &&
    nextRank !== "MASTER";

  return {
    previousRank,
    nextRank,
    rankUp,
    pointsToNextRank: nextReq.pointsToNextRank,
    totalIp: normalized.totalIp,
    latestMockScore: normalized.latestMockScore,
    globalResumeScore: normalized.globalResumeScore,
    masterEvaluationOpen,
    interviewGapToMaster: nextReq.interviewGapToMaster,
    resumeGapToMaster: nextReq.resumeGapToMaster,
  };
}
