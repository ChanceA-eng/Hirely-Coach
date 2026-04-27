import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  EMPTY_INTERVIEW_PROGRESS,
  progressFromSnapshot,
  type AccountInterviewProgress,
} from "@/app/lib/interviewProgress";
import type { GrowthHubSnapshot } from "@/app/lib/interviewStorage";

function coerceProgress(value: unknown): AccountInterviewProgress {
  if (!value || typeof value !== "object") {
    return EMPTY_INTERVIEW_PROGRESS;
  }

  const data = value as Partial<AccountInterviewProgress>;

  return {
    hasCompletedInterview: Boolean(data.hasCompletedInterview),
    interviewCount: typeof data.interviewCount === "number" ? data.interviewCount : 0,
    latestInterviewAt: typeof data.latestInterviewAt === "number" ? data.latestInterviewAt : 0,
    latestJobTitle: typeof data.latestJobTitle === "string" ? data.latestJobTitle : "",
    latestTopWeakness: typeof data.latestTopWeakness === "string" ? data.latestTopWeakness : "",
    latestStarrScore: typeof data.latestStarrScore === "number" ? data.latestStarrScore : 0,
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const progress = coerceProgress(user.publicMetadata?.interviewProgress);
  return NextResponse.json(progress);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { snapshot?: GrowthHubSnapshot };
  if (!body.snapshot) {
    return NextResponse.json({ error: "snapshot required" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const current = coerceProgress(user.publicMetadata?.interviewProgress);
  const incoming = progressFromSnapshot(body.snapshot);

  const next: AccountInterviewProgress = {
    hasCompletedInterview: true,
    interviewCount: Math.max(current.interviewCount + 1, incoming.interviewCount),
    latestInterviewAt: Math.max(current.latestInterviewAt, incoming.latestInterviewAt),
    latestJobTitle:
      incoming.latestInterviewAt >= current.latestInterviewAt
        ? incoming.latestJobTitle
        : current.latestJobTitle,
    latestTopWeakness:
      incoming.latestInterviewAt >= current.latestInterviewAt
        ? incoming.latestTopWeakness
        : current.latestTopWeakness,
    latestStarrScore:
      incoming.latestInterviewAt >= current.latestInterviewAt
        ? incoming.latestStarrScore
        : current.latestStarrScore,
  };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      interviewProgress: next,
    },
  });

  return NextResponse.json(next);
}