import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

type FoundationProgress = {
  completedLessons: string[];
  completedModules: number[];
  assessmentScores: Record<string, number>;
  graduatedAt?: string;
};

function normalizeProgress(raw: unknown): FoundationProgress {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    completedLessons: Array.isArray(r.completedLessons) ? r.completedLessons.map(String) : [],
    completedModules: Array.isArray(r.completedModules) ? r.completedModules.map(Number) : [],
    assessmentScores:
      r.assessmentScores && typeof r.assessmentScores === "object"
        ? (r.assessmentScores as Record<string, number>)
        : {},
    graduatedAt: r.graduatedAt ? String(r.graduatedAt) : undefined,
  };
}

function normalizeOverride(raw: unknown): number[] {
  const row = (raw ?? {}) as Record<string, unknown>;
  const unlockedModules = Array.isArray(row.unlocked_modules)
    ? row.unlocked_modules
    : Array.isArray(row.foundationUnlockedModules)
      ? row.foundationUnlockedModules
      : [];

  return unlockedModules
    .map(Number)
    .filter((moduleNum) => Number.isFinite(moduleNum) && moduleNum >= 1 && moduleNum <= 12);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;

  const interviewAdminOverride = (meta.interviewAdminOverride ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    foundation_progress: normalizeProgress(meta.foundation_progress),
    foundation_override: {
      unlocked_modules: normalizeOverride(interviewAdminOverride),
    },
  });
}