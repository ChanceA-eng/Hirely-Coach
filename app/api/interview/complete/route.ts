import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { checkRankUpgrade } from "@/app/lib/checkRankUpgrade";

type RequestBody = {
  starrScore?: number;
  questionCount?: number;
};

type ProgressionState = {
  totalIp: number;
  currentRank: "APPRENTICE" | "PROFESSIONAL" | "MASTER";
  latestMockScore: number;
  lastInterviewRewardDay: string;
  interviewScores: number[];
};

function toSafeInt(value: unknown): number {
  const n = Math.floor(Number(value || 0));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function normalizeProgressionState(input: unknown): ProgressionState {
  const row = (input ?? {}) as Record<string, unknown>;
  const currentRank = row.currentRank === "MASTER" || row.currentRank === "PROFESSIONAL" || row.currentRank === "APPRENTICE"
    ? row.currentRank
    : "APPRENTICE";
  return {
    totalIp: toSafeInt(row.totalIp),
    currentRank,
    latestMockScore: toSafeInt(row.latestMockScore),
    lastInterviewRewardDay: String(row.lastInterviewRewardDay || ""),
    interviewScores: Array.isArray(row.interviewScores)
      ? row.interviewScores.map((score) => toSafeInt(score)).slice(0, 12)
      : [],
  };
}

function dayStamp(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${now.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scoreBonus(score: number): number {
  if (score >= 90) return 100;
  if (score >= 80) return 50;
  if (score >= 70) return 20;
  return 0;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as RequestBody;
  const starrScore = toSafeInt(body.starrScore);
  const questionCount = toSafeInt(body.questionCount);

  const participation = questionCount >= 5 ? 50 : 0;
  const bonus = scoreBonus(starrScore);
  const baseAward = participation + bonus;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const progression = normalizeProgressionState(metadata.progressionState);
  const today = dayStamp();
  const dailyDouble = progression.lastInterviewRewardDay !== today;

  const interviewAward = dailyDouble ? baseAward * 2 : baseAward;
  let nextTotalIp = progression.totalIp + interviewAward;

  const upgrade = await checkRankUpgrade(userId, {
    totalIp: nextTotalIp,
    latestMockScore: starrScore,
    previousRank: progression.currentRank,
  });

  let rankBonus = 0;
  if (upgrade.rankUp) {
    rankBonus = 500;
    nextTotalIp += rankBonus;
  }

  const nextProgression: ProgressionState = {
    totalIp: nextTotalIp,
    currentRank: upgrade.nextRank,
    latestMockScore: starrScore,
    lastInterviewRewardDay: today,
    interviewScores: [starrScore, ...progression.interviewScores].slice(0, 12),
  };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...metadata,
      progressionState: nextProgression,
    },
  });

  return NextResponse.json({
    ok: true,
    ipAwarded: interviewAward,
    dailyDouble,
    rankBonus,
    totalIp: nextTotalIp,
    rank: upgrade.nextRank,
    rankUp: upgrade.rankUp,
    previousRank: upgrade.previousRank,
  });
}
