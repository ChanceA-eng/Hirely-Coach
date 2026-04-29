import type { GrowthHubSnapshot } from "./interviewStorage";

export type AccountInterviewProgress = {
  hasCompletedInterview: boolean;
  interviewCount: number;
  latestInterviewAt: number;
  latestJobTitle: string;
  latestTopWeakness: string;
  latestStarrScore: number;
  completedTiers: number[];
  highestCompletedTier: number;
};

export const EMPTY_INTERVIEW_PROGRESS: AccountInterviewProgress = {
  hasCompletedInterview: false,
  interviewCount: 0,
  latestInterviewAt: 0,
  latestJobTitle: "",
  latestTopWeakness: "",
  latestStarrScore: 0,
  completedTiers: [],
  highestCompletedTier: 0,
};

export function progressFromSnapshot(snapshot: GrowthHubSnapshot): AccountInterviewProgress {
  return {
    hasCompletedInterview: true,
    interviewCount: 1,
    latestInterviewAt: snapshot.createdAt,
    latestJobTitle: snapshot.jobTitle,
    latestTopWeakness: snapshot.topWeakness,
    latestStarrScore: snapshot.starrScore,
    completedTiers: [],
    highestCompletedTier: 0,
  };
}

export function snapshotFromProgress(progress: AccountInterviewProgress): GrowthHubSnapshot | null {
  if (!progress.hasCompletedInterview) return null;
  return {
    sessionId: `account-${progress.latestInterviewAt || "latest"}`,
    createdAt: progress.latestInterviewAt || Date.now(),
    starrScore: progress.latestStarrScore,
    topWeakness: progress.latestTopWeakness,
    jobTitle: progress.latestJobTitle || "Interview Session",
  };
}

export async function syncInterviewProgress(
  snapshot: GrowthHubSnapshot,
  options?: { completedTier?: number }
) {
  const response = await fetch("/api/user/interview-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot, completedTier: options?.completedTier }),
  });

  if (!response.ok) {
    throw new Error("Unable to sync interview progress.");
  }

  return response.json() as Promise<AccountInterviewProgress>;
}

export async function loadAccountInterviewProgress() {
  const response = await fetch("/api/user/interview-progress", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load interview progress.");
  }
  return response.json() as Promise<AccountInterviewProgress>;
}